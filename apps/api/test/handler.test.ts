import { INSTALL_ID_HEADER, MAX_BODY_BYTES } from "@shouldi/shared";
import { describe, expect, it, vi } from "vitest";
import type { JevAnswers } from "../lib/compose.js";
import { createAssessHandler, type Jev, type LogEntry } from "../lib/handler.js";
import { createLimits } from "../lib/limits.js";
import { memoryStore } from "./memory-store.js";

const ORIGIN = "chrome-extension://abcdefghijklmnopabcdefghijklmnop";
const INSTALL_ID = "0b9c6a2e-1f3d-4c5b-9a8e-7d6c5b4a3f21";
const RESUME = "Jordan Example. Senior TypeScript engineer, 8 years building web apps.";
const JOB = "Senior Frontend Engineer. Requires TypeScript and React. 5+ years.";

const goodAnswers: JevAnswers = {
  is_job_posting: { noul: 0.97 },
  skills: { score: 3.8 },
  tasks: { score: 3.5 },
  experience: { score: 4 },
  industry: { score: 3 },
  education: { score: 3 },
  experience_stated: { noul: 0.9 },
  industry_stated: { noul: 0.8 },
  education_stated: { noul: 0.2 },
};

function setup(options: { jev?: Jev; allowedOrigins?: string[] | null; limit?: number } = {}) {
  const { store, hashes } = memoryStore();
  const limits = createLimits(store, {
    perInstallPerDay: options.limit ?? 50,
    perIpPerDay: 200,
    dailyInputTokenCap: 1_000_000,
    statsRetentionDays: 90,
  });
  const jev: Jev = options.jev ?? {
    assess: vi.fn(async () => ({ model: "jev-test", answers: goodAnswers, usage: { input_tokens: 1234 } })),
  };
  const logs: LogEntry[] = [];
  const handler = createAssessHandler({
    jev: () => jev,
    limits: () => limits,
    ipHashSecret: () => "test-secret",
    allowedOrigins: options.allowedOrigins === undefined ? [ORIGIN] : options.allowedOrigins,
    now: () => new Date("2026-09-19T12:00:00Z"),
    log: (entry) => logs.push(entry),
  });
  return { handler, jev, logs, stats: () => hashes.get("stats:2026-09-19") };
}

function request(options: { origin?: string | null; body?: unknown; installId?: string | null } = {}) {
  const headers = new Headers({ "content-type": "application/json", "x-real-ip": "203.0.113.7" });
  const origin = options.origin === undefined ? ORIGIN : options.origin;
  if (origin !== null) headers.set("origin", origin);
  const installId = options.installId === undefined ? INSTALL_ID : options.installId;
  if (installId !== null) headers.set(INSTALL_ID_HEADER, installId);
  const body = options.body === undefined ? { resumeText: RESUME, jobText: JOB } : options.body;
  return new Request("https://shouldiapply.vercel.app/api/assess", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/assess", () => {
  it("returns the composed result with CORS headers for the extension origin", async () => {
    const { handler, jev, logs, stats } = setup();
    const response = await handler.POST(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe(ORIGIN);
    const body = await response.json();
    expect(body.kind).toBe("result");
    expect(body.overall.label).toBe("Excellent match");
    expect(jev.assess).toHaveBeenCalledWith({ job: { text: JOB }, resume: { text: RESUME } });
    expect(stats()?.get("assessments")).toBe(1);
    expect(stats()?.get("input_tokens")).toBe(1234);
    expect(logs).toEqual([{ event: "assess", model: "jev-test", kind: "result" }]);
  });

  it("never logs the resume text, the job text, the install ID, or the IP address", async () => {
    const failing: Jev = { assess: async () => Promise.reject(new Error(`boom ${RESUME}`)) };
    for (const jev of [undefined, failing]) {
      const { handler, logs } = setup({ jev });
      await handler.POST(request());
      const logged = JSON.stringify(logs);
      for (const secret of [RESUME, JOB, INSTALL_ID, "203.0.113.7", "Jordan"]) {
        expect(logged).not.toContain(secret);
      }
    }
  });

  it("rejects other website origins", async () => {
    const { handler, jev } = setup();
    const response = await handler.POST(request({ origin: "https://evil.example" }));
    expect(response.status).toBe(403);
    expect(jev.assess).not.toHaveBeenCalled();
  });

  it("allows any extension origin when no origins are configured", async () => {
    const { handler } = setup({ allowedOrigins: null });
    const response = await handler.POST(request({ origin: "chrome-extension://zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz" }));
    expect(response.status).toBe(200);
  });

  it("rejects bodies larger than 64 KB", async () => {
    const { handler } = setup();
    const response = await handler.POST(request({ body: "x".repeat(MAX_BODY_BYTES + 1) }));
    expect(response.status).toBe(413);
  });

  it("rejects a missing install ID and invalid bodies", async () => {
    const { handler } = setup();
    expect((await handler.POST(request({ installId: null }))).status).toBe(400);
    expect((await handler.POST(request({ body: "not json" }))).status).toBe(400);
    expect((await handler.POST(request({ body: { resumeText: "", jobText: JOB } }))).status).toBe(400);
  });

  it("returns daily_limit with a reset time after the per-install limit", async () => {
    const { handler, stats } = setup({ limit: 1 });
    expect((await handler.POST(request())).status).toBe(200);
    const response = await handler.POST(request());
    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body.error.code).toBe("daily_limit");
    expect(body.error.retryAt).toBe("2026-09-20T00:00:00.000Z");
    expect(body.error.message).toContain("{time}");
    expect(stats()?.get("daily_limit")).toBe(1);
  });

  it("returns server_error and gives the quota back when Jev fails", async () => {
    const failing: Jev = { assess: vi.fn(async () => Promise.reject(new Error("down"))) };
    const { handler, stats } = setup({ jev: failing, limit: 1 });
    expect((await handler.POST(request())).status).toBe(502);
    expect((await handler.POST(request())).status).toBe(502); // not 429: the failed call was released
    expect(stats()?.get("errors")).toBe(2);
  });
});

describe("POST /api/assess edge cases", () => {
  it("returns busy (503) with the reset time when the daily cost cap is reached", async () => {
    const { store, hashes } = memoryStore();
    const limits = createLimits(store, { perInstallPerDay: 50, perIpPerDay: 200, dailyInputTokenCap: 100, statsRetentionDays: 90 });
    await limits.count("input_tokens", new Date("2026-09-19T12:00:00Z"), 100);
    const jev: Jev = { assess: vi.fn() };
    const handler = createAssessHandler({
      jev: () => jev,
      limits: () => limits,
      ipHashSecret: () => "s",
      allowedOrigins: [ORIGIN],
      now: () => new Date("2026-09-19T12:00:00Z"),
      log: () => {},
    });
    const response = await handler.POST(request());
    expect(response.status).toBe(503);
    expect((await response.json()).error).toMatchObject({ code: "busy", retryAt: "2026-09-20T00:00:00.000Z" });
    expect(jev.assess).not.toHaveBeenCalled();
    expect(hashes.get("stats:2026-09-19")?.get("busy")).toBe(1);
  });

  it("counts a page that is not a job posting, and its tokens", async () => {
    const jev: Jev = {
      assess: async () => ({
        model: "jev-test",
        answers: { ...goodAnswers, is_job_posting: { noul: 0.1 } },
        usage: { input_tokens: 500 },
      }),
    };
    const { handler, stats } = setup({ jev });
    const body = await (await handler.POST(request())).json();
    expect(body.kind).toBe("not_job_posting");
    expect(stats()?.get("not_job_posting")).toBe(1);
    expect(stats()?.get("assessments")).toBeUndefined();
    expect(stats()?.get("input_tokens")).toBe(500);
  });

  it("accepts a request with no Origin header (not a browser) without CORS headers", async () => {
    const { handler } = setup();
    const response = await handler.POST(request({ origin: null }));
    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("rejects a too-large declared Content-Length before reading the body", async () => {
    const { handler, jev } = setup();
    const big = new Request("https://shouldiapply.vercel.app/api/assess", {
      method: "POST",
      headers: { origin: ORIGIN, "content-length": String(MAX_BODY_BYTES + 1), [INSTALL_ID_HEADER]: INSTALL_ID },
      body: "{}",
    });
    expect((await handler.POST(big)).status).toBe(413);
    expect(jev.assess).not.toHaveBeenCalled();
  });

  it("returns server_error when the limit store fails, and logs only the error type", async () => {
    const logs: LogEntry[] = [];
    const handler = createAssessHandler({
      jev: () => ({ assess: vi.fn() }),
      limits: () => {
        throw new Error("Missing Upstash Redis environment variables");
      },
      ipHashSecret: () => "s",
      allowedOrigins: [ORIGIN],
      log: (entry) => logs.push(entry),
    });
    const response = await handler.POST(request());
    expect(response.status).toBe(502);
    expect(response.headers.get("access-control-allow-origin")).toBe(ORIGIN);
    expect(logs).toEqual([{ event: "assess_error", error: "Error", status: undefined }]);
  });

  it("logs the HTTP status of a TypeSafe error", async () => {
    const failure = Object.assign(new Error("rate limited"), { status: 429 });
    const { handler, logs } = setup({ jev: { assess: async () => Promise.reject(failure) } });
    expect((await handler.POST(request())).status).toBe(502);
    expect(logs).toEqual([{ event: "assess_error", error: "Error", status: 429 }]);
  });

  it("rejects an install ID that is not a UUID", async () => {
    const { handler } = setup();
    expect((await handler.POST(request({ installId: "not-a-uuid" }))).status).toBe(400);
  });
});

describe("OPTIONS /api/assess", () => {
  it("answers the CORS preflight for the extension origin only", () => {
    const { handler } = setup();
    const preflight = (origin: string) =>
      handler.OPTIONS(new Request("https://shouldiapply.vercel.app/api/assess", { method: "OPTIONS", headers: { origin } }));
    const ok = preflight(ORIGIN);
    expect(ok.status).toBe(204);
    expect(ok.headers.get("access-control-allow-headers")).toContain(INSTALL_ID_HEADER);
    expect(preflight("https://evil.example").status).toBe(403);
  });
});
