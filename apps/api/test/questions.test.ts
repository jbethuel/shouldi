import { describe, expect, it } from "vitest";
import { WEIGHTS } from "../lib/compose.js";
import { questions } from "../lib/questions.js";

describe("questions", () => {
  it("asks one five-level score for each weighted criterion", () => {
    for (const id of Object.keys(WEIGHTS)) {
      const question = questions[id as keyof typeof questions];
      expect(question.type).toBe("score");
      expect(question.type === "score" && question.criteria.length).toBe(5);
    }
  });

  it("asks the job-posting check and the three stated checks as yes/no questions", () => {
    for (const id of ["is_job_posting", "experience_stated", "industry_stated", "education_stated"] as const) {
      expect(questions[id].type).toBe("noul");
    }
  });

  it("refers to the state fields that the server sends", () => {
    for (const question of Object.values(questions)) {
      expect(String(question.instructions)).toContain("`job.text`");
    }
  });
});
