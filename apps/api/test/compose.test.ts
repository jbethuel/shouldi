import { describe, expect, it } from "vitest";
import { compose, type JevAnswers, LABELS, labelFor } from "../lib/compose.js";
import * as copy from "../lib/copy.js";
import { CRITERION_SENTENCES, NOT_STATED_SENTENCES, TIP } from "../lib/copy.js";

function answers(overrides: Partial<Record<keyof JevAnswers, number>> = {}): JevAnswers {
  const v = (key: keyof JevAnswers, fallback: number) => overrides[key] ?? fallback;
  return {
    is_job_posting: { noul: v("is_job_posting", 0.95) },
    skills: { score: v("skills", 4) },
    tasks: { score: v("tasks", 4) },
    experience: { score: v("experience", 4) },
    industry: { score: v("industry", 4) },
    education: { score: v("education", 4) },
    experience_stated: { noul: v("experience_stated", 0.9) },
    industry_stated: { noul: v("industry_stated", 0.9) },
    education_stated: { noul: v("education_stated", 0.9) },
  };
}

describe("compose", () => {
  it("returns the not-a-job-posting message when Jev says the page is not a job posting", () => {
    const result = compose(answers({ is_job_posting: 0.2 }), "jev-test");
    expect(result.kind).toBe("not_job_posting");
  });

  it("gives an excellent match with no tip when every criterion is at the top level", () => {
    const result = compose(answers(), "jev-test");
    if (result.kind !== "result") throw new Error("expected a result");
    expect(result.overall).toEqual({ label: "Excellent match", steps: 5 });
    expect(result.tip).toBeNull();
    expect(result.model).toBe("jev-test");
    expect(result.criteria.every((c) => c.steps === 5)).toBe(true);
  });

  it("gives an early match with the tip when every criterion is at the bottom level", () => {
    const result = compose(
      answers({ skills: 0, tasks: 0, experience: 0, industry: 0, education: 0 }),
      "jev-test",
    );
    if (result.kind !== "result") throw new Error("expected a result");
    expect(result.overall).toEqual({ label: "Early match", steps: 1 });
    expect(result.tip).toBe(TIP);
    expect(result.criteria.find((c) => c.id === "skills")?.sentence).toBe(CRITERION_SENTENCES.skills[0]);
  });

  it("shares the weight of an unstated criterion among the stated ones", () => {
    // Education is low but not stated, so it must not pull the total down.
    const result = compose(answers({ education: 0, education_stated: 0.1 }), "jev-test");
    if (result.kind !== "result") throw new Error("expected a result");
    expect(result.overall.label).toBe("Excellent match");
    const education = result.criteria.find((c) => c.id === "education");
    expect(education).toEqual({
      id: "education",
      name: "Education and certificates",
      stated: false,
      steps: null,
      sentence: NOT_STATED_SENTENCES.education,
    });
  });

  it("orders criteria from strongest to weakest, with unstated criteria last", () => {
    const result = compose(
      answers({ skills: 1, tasks: 3.6, experience: 2, industry: 0, industry_stated: 0.2, education: 4 }),
      "jev-test",
    );
    if (result.kind !== "result") throw new Error("expected a result");
    expect(result.criteria.map((c) => c.id)).toEqual(["education", "tasks", "experience", "skills", "industry"]);
  });

  it("rounds a between-level score to the nearest level for the bar and sentence", () => {
    const result = compose(answers({ skills: 2.6 }), "jev-test");
    if (result.kind !== "result") throw new Error("expected a result");
    const skills = result.criteria.find((c) => c.id === "skills");
    expect(skills?.steps).toBe(4);
    expect(skills?.sentence).toBe(CRITERION_SENTENCES.skills[3]);
  });
});

describe("compose edge cases", () => {
  it("treats probabilities of exactly 0.5 as yes", () => {
    const result = compose(answers({ is_job_posting: 0.5, education_stated: 0.5 }), "jev-test");
    if (result.kind !== "result") throw new Error("expected a result");
    expect(result.criteria.find((c) => c.id === "education")?.stated).toBe(true);
  });

  it("keeps scores outside 0 to 4 inside the scale", () => {
    const result = compose(answers({ skills: 4.3, tasks: -0.2 }), "jev-test");
    if (result.kind !== "result") throw new Error("expected a result");
    expect(result.criteria.find((c) => c.id === "skills")?.steps).toBe(5);
    expect(result.criteria.find((c) => c.id === "tasks")?.steps).toBe(1);
  });

  it("uses only skills and tasks when the job states nothing else", () => {
    // 0.3/0.55 * 4/4 + 0.25/0.55 * 0/4 = 0.545 -> Good match
    const result = compose(
      answers({ skills: 4, tasks: 0, experience_stated: 0, industry_stated: 0, education_stated: 0, experience: 0, industry: 0, education: 0 }),
      "jev-test",
    );
    if (result.kind !== "result") throw new Error("expected a result");
    expect(result.overall.label).toBe("Good match");
    expect(result.criteria.filter((c) => !c.stated).map((c) => c.id)).toEqual(["experience", "industry", "education"]);
  });

  it("orders equal scores by weight", () => {
    const result = compose(answers({ skills: 2, tasks: 2, experience: 2, industry: 2, education: 2 }), "jev-test");
    if (result.kind !== "result") throw new Error("expected a result");
    expect(result.criteria.map((c) => c.id)).toEqual(["skills", "tasks", "experience", "industry", "education"]);
  });

  it("never uses the words that the design review excluded", () => {
    const banned = /\b(fail|reject|unqualified|poor|weak|skip|not a fit)\b/i;
    const userFacing = JSON.stringify([copy, LABELS]);
    expect(userFacing).toContain("Early match");
    expect(userFacing).not.toMatch(banned);
  });
});

describe("labelFor", () => {
  it.each([
    [0.85, "Excellent match"],
    [0.849, "Strong match"],
    [0.7, "Strong match"],
    [0.5, "Good match"],
    [0.3, "Partial match"],
    [0.299, "Early match"],
    [0, "Early match"],
  ])("maps %f to %s", (total, label) => {
    expect(labelFor(total).label).toBe(label);
  });
});
