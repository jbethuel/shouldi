import { APIError, type Fetch } from "@typesafe-ai/sdk";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createJev } from "../lib/jev.js";
import { questions } from "../lib/questions.js";

const state = { job: { text: "Senior engineer wanted." }, resume: { text: "Private resume text 7f3a." } };

function reply(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

const ok = {
  model: "jev-1.13.0",
  answers: { is_job_posting: { type: "noul", noul: 0.9 } },
  usage: { input_tokens: 2400, output_tokens: 0 },
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createJev", () => {
  it("sends one request with the job and resume state and all questions", async () => {
    const fetch = vi.fn<Fetch>(async () => reply(200, ok));
    const jev = createJev("ts-key", "jev-latest", { fetch });

    const result = await jev.assess(state);

    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe("https://api.typesafe.ai/v1/systemone");
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer ts-key");
    const body = JSON.parse(String(init?.body));
    expect(body.model).toBe("jev-latest");
    expect(body.state).toEqual(state);
    expect(Object.keys(body.questions).sort()).toEqual(Object.keys(questions).sort());
    expect(result).toEqual({ model: ok.model, answers: ok.answers, usage: ok.usage });
  });

  it("does not send extra fields from the caller's state object", async () => {
    const fetch = vi.fn<Fetch>(async () => reply(200, ok));
    const jev = createJev("ts-key", "jev-latest", { fetch });
    await jev.assess({ ...state, extra: "should not leave" } as never);
    expect(String(fetch.mock.calls[0]![1]?.body)).not.toContain("should not leave");
  });

  it("does not retry a bad request and throws an APIError with the status", async () => {
    const fetch = vi.fn<Fetch>(async () => reply(400, { error: "bad" }));
    const jev = createJev("ts-key", "jev-latest", { fetch });
    await expect(jev.assess(state)).rejects.toMatchObject({ status: 400 });
    await expect(jev.assess(state)).rejects.toBeInstanceOf(APIError);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("retries a server error once, and never logs the resume text", async () => {
    const spies = (["debug", "info", "warn", "error", "log"] as const).map((level) =>
      vi.spyOn(console, level).mockImplementation(() => {}),
    );
    const fetch = vi.fn<Fetch>(async () => reply(500, { error: "down" }));
    const jev = createJev("ts-key", "jev-latest", { fetch });

    await expect(jev.assess(state)).rejects.toMatchObject({ status: 500 });

    expect(fetch).toHaveBeenCalledTimes(2);
    const logged = JSON.stringify(spies.flatMap((spy) => spy.mock.calls));
    expect(logged).not.toContain("Private resume text 7f3a.");
    expect(logged).not.toContain("ts-key");
  });

  it("ignores TYPESAFE_LOG_LEVEL=debug, which would log request bodies", async () => {
    vi.stubEnv("TYPESAFE_LOG_LEVEL", "debug");
    const spies = (["debug", "info", "warn", "error", "log"] as const).map((level) =>
      vi.spyOn(console, level).mockImplementation(() => {}),
    );
    const jev = createJev("ts-key", "jev-latest", { fetch: async () => reply(200, ok) });
    await jev.assess(state);
    expect(JSON.stringify(spies.flatMap((spy) => spy.mock.calls))).not.toContain("Private resume text 7f3a.");
    vi.unstubAllEnvs();
  });
});
