import { describe, expect, it } from "vitest";
import {
  assessRequestSchema,
  assessResponseSchema,
  errorResponseSchema,
  installIdSchema,
  MAX_JOB_CHARS,
  MAX_RESUME_CHARS,
} from "./index.js";

describe("assessRequestSchema", () => {
  it("trims both texts", () => {
    expect(assessRequestSchema.parse({ resumeText: "  Engineer ", jobText: "\nJob\n" })).toEqual({
      resumeText: "Engineer",
      jobText: "Job",
    });
  });

  it("rejects empty or blank texts", () => {
    expect(assessRequestSchema.safeParse({ resumeText: "   ", jobText: "Job" }).success).toBe(false);
    expect(assessRequestSchema.safeParse({ resumeText: "Engineer", jobText: "" }).success).toBe(false);
  });

  it("enforces the character limits", () => {
    const ok = { resumeText: "r".repeat(MAX_RESUME_CHARS), jobText: "j".repeat(MAX_JOB_CHARS) };
    expect(assessRequestSchema.safeParse(ok).success).toBe(true);
    expect(assessRequestSchema.safeParse({ ...ok, resumeText: `${ok.resumeText}r` }).success).toBe(false);
    expect(assessRequestSchema.safeParse({ ...ok, jobText: `${ok.jobText}j` }).success).toBe(false);
  });

  it("drops unknown fields", () => {
    const parsed = assessRequestSchema.parse({ resumeText: "Engineer", jobText: "Job", email: "jane@example.com" });
    expect(parsed).not.toHaveProperty("email");
  });
});

describe("installIdSchema", () => {
  it("accepts UUIDs in either letter case", () => {
    expect(installIdSchema.safeParse("0b9c6a2e-1f3d-4c5b-9a8e-7d6c5b4a3f21").success).toBe(true);
    expect(installIdSchema.safeParse("0B9C6A2E-1F3D-4C5B-9A8E-7D6C5B4A3F21").success).toBe(true);
  });

  it.each(["", "not-a-uuid", "0b9c6a2e1f3d4c5b9a8e7d6c5b4a3f21", "0b9c6a2e-1f3d-4c5b-9a8e-7d6c5b4a3f21x"])(
    "rejects %j",
    (value) => {
      expect(installIdSchema.safeParse(value).success).toBe(false);
    },
  );
});

describe("assessResponseSchema", () => {
  const result = {
    kind: "result",
    model: "jev-1.13.0",
    overall: { label: "Good match", steps: 3 },
    criteria: [
      { id: "skills", name: "Skills", stated: true, steps: 4, sentence: "You have most of the skills." },
      { id: "education", name: "Education", stated: false, steps: null, sentence: "This job does not say." },
    ],
    tip: null,
  };

  it("accepts a result and a not-a-job-posting answer", () => {
    expect(assessResponseSchema.parse(result)).toEqual(result);
    const notJob = { kind: "not_job_posting", message: "No job here." };
    expect(assessResponseSchema.parse(notJob)).toEqual(notJob);
  });

  it("rejects bars outside 1 to 5 steps and unknown criteria", () => {
    expect(assessResponseSchema.safeParse({ ...result, overall: { label: "x", steps: 6 } }).success).toBe(false);
    expect(assessResponseSchema.safeParse({ ...result, overall: { label: "x", steps: 0 } }).success).toBe(false);
    const unknown = { ...result, criteria: [{ ...result.criteria[0], id: "salary" }] };
    expect(assessResponseSchema.safeParse(unknown).success).toBe(false);
  });

  it("rejects an unknown kind", () => {
    expect(assessResponseSchema.safeParse({ kind: "maybe" }).success).toBe(false);
  });
});

describe("errorResponseSchema", () => {
  it("accepts known codes with an optional reset time", () => {
    expect(errorResponseSchema.safeParse({ error: { code: "busy", message: "m", retryAt: "2026-09-20T00:00:00.000Z" } }).success).toBe(true);
    expect(errorResponseSchema.safeParse({ error: { code: "server_error", message: "m" } }).success).toBe(true);
  });

  it("rejects unknown codes", () => {
    expect(errorResponseSchema.safeParse({ error: { code: "teapot", message: "m" } }).success).toBe(false);
  });
});
