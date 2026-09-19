import { describe, expect, it, vi } from "vitest";

describe("api/assess entry", () => {
  it("returns a clean server error instead of crashing when the environment is not configured", async () => {
    for (const name of ["TYPESAFE_API_KEY", "UPSTASH_REDIS_REST_URL", "KV_REST_API_URL", "IP_HASH_SECRET"]) {
      vi.stubEnv(name, "");
    }
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const { POST, OPTIONS } = await import("../api/assess.js");
    const origin = "chrome-extension://abcdefghijklmnopabcdefghijklmnop";

    expect(OPTIONS(new Request("https://x.test/api/assess", { method: "OPTIONS", headers: { origin } })).status).toBe(204);

    const response = await POST(
      new Request("https://x.test/api/assess", {
        method: "POST",
        headers: {
          origin,
          "content-type": "application/json",
          "x-install-id": "0b9c6a2e-1f3d-4c5b-9a8e-7d6c5b4a3f21",
        },
        body: JSON.stringify({ resumeText: "Engineer", jobText: "Engineer wanted" }),
      }),
    );
    expect(response.status).toBe(502);
    expect((await response.json()).error.code).toBe("server_error");
    log.mockRestore();
    vi.unstubAllEnvs();
  });
});
