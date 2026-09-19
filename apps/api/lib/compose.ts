import type { AssessResponse, CriterionId, CriterionResult } from "@shouldi/shared";
import { CRITERION_NAMES, CRITERION_SENTENCES, NOT_JOB_POSTING, NOT_STATED_SENTENCES, TIP } from "./copy.js";

/** The subset of Jev answers that composition reads. Real SDK answers satisfy it structurally. */
export interface JevAnswers {
  is_job_posting: { noul: number };
  skills: { score: number };
  tasks: { score: number };
  experience: { score: number };
  industry: { score: number };
  education: { score: number };
  experience_stated: { noul: number };
  industry_stated: { noul: number };
  education_stated: { noul: number };
}

export const WEIGHTS: Record<CriterionId, number> = {
  skills: 0.3,
  tasks: 0.25,
  experience: 0.2,
  industry: 0.15,
  education: 0.1,
};

const STATED_QUESTION: Partial<Record<CriterionId, keyof JevAnswers>> = {
  experience: "experience_stated",
  industry: "industry_stated",
  education: "education_stated",
};

const MAX_LEVEL = 4;
const YES = 0.5;

/** Ordered from the highest threshold down; steps are the filled steps of the 5-step bar. */
export const LABELS = [
  { min: 0.85, label: "Excellent match", steps: 5 },
  { min: 0.7, label: "Strong match", steps: 4 },
  { min: 0.5, label: "Good match", steps: 3 },
  { min: 0.3, label: "Partial match", steps: 2 },
  { min: 0, label: "Early match", steps: 1 },
] as const;

/** Labels at or below "Good match" show the tip. */
const TIP_MAX_STEPS = 3;

export function labelFor(total: number): (typeof LABELS)[number] {
  return LABELS.find((l) => total >= l.min) ?? LABELS[LABELS.length - 1]!;
}

export function compose(answers: JevAnswers, model: string): AssessResponse {
  if (answers.is_job_posting.noul < YES) {
    return { kind: "not_job_posting", message: NOT_JOB_POSTING };
  }

  const ids = Object.keys(WEIGHTS) as CriterionId[];
  const scored = ids.map((id) => {
    const statedKey = STATED_QUESTION[id];
    const stated = statedKey === undefined || (answers[statedKey] as { noul: number }).noul >= YES;
    const score = clamp(answers[id].score, 0, MAX_LEVEL);
    return { id, stated, score, level: Math.round(score) };
  });

  // Unstated criteria give their weight to the stated ones, in proportion to their weights.
  const statedWeight = scored.filter((c) => c.stated).reduce((sum, c) => sum + WEIGHTS[c.id], 0);
  const total = scored
    .filter((c) => c.stated)
    .reduce((sum, c) => sum + (WEIGHTS[c.id] / statedWeight) * (c.score / MAX_LEVEL), 0);
  const overall = labelFor(total);

  const criteria: CriterionResult[] = scored
    .sort((a, b) => Number(b.stated) - Number(a.stated) || b.score - a.score || WEIGHTS[b.id] - WEIGHTS[a.id])
    .map((c) => ({
      id: c.id,
      name: CRITERION_NAMES[c.id],
      stated: c.stated,
      steps: c.stated ? c.level + 1 : null,
      sentence: c.stated ? CRITERION_SENTENCES[c.id][c.level]! : NOT_STATED_SENTENCES[c.id]!,
    }));

  return {
    kind: "result",
    model,
    overall: { label: overall.label, steps: overall.steps },
    criteria,
    tip: overall.steps <= TIP_MAX_STEPS ? TIP : null,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
