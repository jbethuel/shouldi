import { describe, expect, it, vi } from "vitest";
import { localTime, readResponse, requestAssessment } from "./api";
import { MESSAGES } from "./messages";

describe("readResponse", () => {
  it("returns a valid result", () => {
    const body = { kind: "not_job_posting", message: "We could not find a job posting on this page." };
    expect(readResponse(200, body)).toEqual({ ok: true, response: body });
  });

  it("puts the local reset time into limit messages", () => {
    const retryAt = "2026-09-20T00:00:00.000Z";
    const body = {
      error: { code: "daily_limit", message: "You can assess more after {time}.", retryAt },
    };
    expect(readResponse(429, body)).toEqual({ ok: false, message: `You can assess more after ${localTime(retryAt)}.` });
  });

  it("treats a 429 without our error body as the one-minute firewall limit", () => {
    expect(readResponse(429, "<html>Too Many Requests</html>")).toEqual({ ok: false, message: MESSAGES.rateLimited });
  });

  it("shows the try-again message for unexpected bodies", () => {
    expect(readResponse(200, { kind: "other" })).toEqual({ ok: false, message: MESSAGES.tryAgain });
    expect(readResponse(500, null)).toEqual({ ok: false, message: MESSAGES.tryAgain });
  });
});

describe("localTime", () => {
  it("formats hours and minutes", () => {
    expect(localTime("2026-09-20T00:00:00.000Z", "en-US")).toMatch(/^\d{1,2}:00\s?(AM|PM)$/);
  });
});

describe("requestAssessment", () => {
  const request = { resumeText: "Engineer", jobText: "Senior engineer wanted" };
  const result = { kind: "not_job_posting", message: "No job here." };

  it("posts the texts with the install ID header to the API", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify(result), { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    expect(await requestAssessment(request, "id-1")).toEqual({ ok: true, response: result });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/\/api\/assess$/);
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "Content-Type": "application/json", "x-install-id": "id-1" });
    expect(JSON.parse(init.body as string)).toEqual(request);
    vi.unstubAllGlobals();
  });

  it("shows the try-again message when the network fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))));
    expect(await requestAssessment(request, "id-1")).toEqual({ ok: false, message: MESSAGES.tryAgain });
    vi.unstubAllGlobals();
  });

  it("shows the try-again message when the body is not JSON", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>502</html>", { status: 502 })));
    expect(await requestAssessment(request, "id-1")).toEqual({ ok: false, message: MESSAGES.tryAgain });
    vi.unstubAllGlobals();
  });
});

describe("readResponse errors", () => {
  it("shows a server message without a time as it is", () => {
    const body = { error: { code: "server_error", message: "We cannot assess this job now." } };
    expect(readResponse(502, body)).toEqual({ ok: false, message: "We cannot assess this job now." });
  });

  it("puts the local reset time into the busy message", () => {
    const retryAt = "2026-09-20T00:00:00.000Z";
    const body = { error: { code: "busy", message: "ShouldI is very busy today. Please try again after {time}.", retryAt } };
    const outcome = readResponse(503, body);
    expect(outcome).toEqual({ ok: false, message: `ShouldI is very busy today. Please try again after ${localTime(retryAt)}.` });
    expect(JSON.stringify(outcome)).not.toContain("{time}");
  });
});
