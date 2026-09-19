import {
  type AssessRequest,
  type AssessResponse,
  assessResponseSchema,
  errorResponseSchema,
  INSTALL_ID_HEADER,
  TIME_PLACEHOLDER,
} from "@shouldi/shared";
import { MESSAGES } from "./messages";

const API_URL = (import.meta.env.WXT_API_URL as string | undefined) ?? "https://shouldiapply.vercel.app";

export type AssessOutcome = { ok: true; response: AssessResponse } | { ok: false; message: string };

export async function requestAssessment(request: AssessRequest, installId: string): Promise<AssessOutcome> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/assess`, {
      method: "POST",
      headers: { "Content-Type": "application/json", [INSTALL_ID_HEADER]: installId },
      body: JSON.stringify(request),
    });
  } catch {
    return { ok: false, message: MESSAGES.tryAgain };
  }
  return readResponse(response.status, await response.json().catch(() => null));
}

/** Turn an API status and body into a result or a message for the user. */
export function readResponse(status: number, body: unknown): AssessOutcome {
  if (status >= 200 && status < 300) {
    const parsed = assessResponseSchema.safeParse(body);
    return parsed.success ? { ok: true, response: parsed.data } : { ok: false, message: MESSAGES.tryAgain };
  }
  const error = errorResponseSchema.safeParse(body);
  if (error.success) {
    const { message, retryAt } = error.data.error;
    return { ok: false, message: retryAt ? message.replace(TIME_PLACEHOLDER, localTime(retryAt)) : message };
  }
  // A 429 without our error body comes from the Vercel Firewall (too many requests in one minute).
  return { ok: false, message: status === 429 ? MESSAGES.rateLimited : MESSAGES.tryAgain };
}

export function localTime(iso: string, locale?: string): string {
  return new Date(iso).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
}
