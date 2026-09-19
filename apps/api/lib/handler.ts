import {
  assessRequestSchema,
  type ErrorCode,
  type ErrorResponse,
  INSTALL_ID_HEADER,
  installIdSchema,
  MAX_BODY_BYTES,
} from "@shouldi/shared";
import { ipAddress } from "@vercel/functions";
import { compose, type JevAnswers } from "./compose.js";
import { ERROR_MESSAGES } from "./copy.js";
import { hashIp, type Limits, utcDay } from "./limits.js";

export interface JevState {
  job: { text: string };
  resume: { text: string };
}

export interface Jev {
  assess(state: JevState): Promise<{ model: string; answers: JevAnswers; usage: { input_tokens: number } }>;
}

/** Log entries must never contain resume text, job text, IDs, or IP addresses. */
export type LogEntry =
  | { event: "assess"; model: string; kind: string }
  | { event: "assess_error"; error: string; status?: number };

export interface HandlerDeps {
  jev: () => Jev;
  limits: () => Limits;
  ipHashSecret: () => string;
  /** Allowed extension origins. `null` allows any `chrome-extension://` origin (development). */
  allowedOrigins: string[] | null;
  now?: () => Date;
  log?: (entry: LogEntry) => void;
}

export function createAssessHandler(deps: HandlerDeps) {
  const now = deps.now ?? (() => new Date());
  const log = deps.log ?? ((entry: LogEntry) => console.log(JSON.stringify(entry)));

  function corsHeaders(origin: string | null): Record<string, string> | null {
    if (origin === null) return {};
    const allowed =
      deps.allowedOrigins === null ? origin.startsWith("chrome-extension://") : deps.allowedOrigins.includes(origin);
    if (!allowed) return null;
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": `content-type, ${INSTALL_ID_HEADER}`,
      "Access-Control-Max-Age": "86400",
      Vary: "Origin",
    };
  }

  function json(status: number, body: unknown, headers: Record<string, string>): Response {
    return new Response(JSON.stringify(body), {
      status,
      headers: { ...headers, "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }

  function error(status: number, code: ErrorCode, headers: Record<string, string>, retryAt?: Date): Response {
    const body: ErrorResponse = {
      error: { code, message: ERROR_MESSAGES[code], ...(retryAt ? { retryAt: retryAt.toISOString() } : {}) },
    };
    return json(status, body, headers);
  }

  return {
    OPTIONS(request: Request): Response {
      const cors = corsHeaders(request.headers.get("origin"));
      return new Response(null, { status: cors ? 204 : 403, headers: cors ?? {} });
    },

    async POST(request: Request): Promise<Response> {
      const cors = corsHeaders(request.headers.get("origin"));
      if (cors === null) return error(403, "forbidden", {});

      const declaredLength = Number(request.headers.get("content-length") ?? 0);
      if (declaredLength > MAX_BODY_BYTES) return error(413, "too_large", cors);
      const raw = await request.text();
      if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) return error(413, "too_large", cors);

      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(raw);
      } catch {
        return error(400, "bad_request", cors);
      }
      const body = assessRequestSchema.safeParse(parsedJson);
      const installId = installIdSchema.safeParse(request.headers.get(INSTALL_ID_HEADER));
      if (!body.success || !installId.success) return error(400, "bad_request", cors);

      const time = now();
      const ip = ipAddress(request) ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

      try {
        const limits = deps.limits();
        const reservation = await limits.reserve(installId.data, hashIp(ip, deps.ipHashSecret(), utcDay(time)), time);
        if (!reservation.ok) {
          await limits.count(reservation.code, time);
          return error(reservation.code === "busy" ? 503 : 429, reservation.code, cors, reservation.retryAt);
        }

        try {
          const result = await deps.jev().assess({
            job: { text: body.data.jobText },
            resume: { text: body.data.resumeText },
          });
          const response = compose(result.answers, result.model);
          await Promise.all([
            limits.count("input_tokens", time, result.usage.input_tokens),
            limits.count(response.kind === "result" ? "assessments" : "not_job_posting", time),
          ]);
          log({ event: "assess", model: result.model, kind: response.kind });
          return json(200, response, cors);
        } catch (err) {
          await Promise.all([reservation.release(), limits.count("errors", time)]);
          throw err;
        }
      } catch (err) {
        log({ event: "assess_error", error: errorName(err), status: errorStatus(err) });
        return error(502, "server_error", cors);
      }
    },
  };
}

function errorName(err: unknown): string {
  return err instanceof Error ? err.constructor.name : typeof err;
}

function errorStatus(err: unknown): number | undefined {
  const status = (err as { status?: unknown } | null)?.status;
  return typeof status === "number" ? status : undefined;
}
