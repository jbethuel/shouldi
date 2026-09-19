import { z } from "zod";

export const MAX_JOB_CHARS = 20_000;
export const MAX_RESUME_CHARS = 15_000;
export const MAX_BODY_BYTES = 64 * 1024;
export const INSTALL_ID_HEADER = "x-install-id";

/** Placeholder in server messages that the extension replaces with the local reset time. */
export const TIME_PLACEHOLDER = "{time}";

export const installIdSchema = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

export const assessRequestSchema = z.object({
  resumeText: z.string().trim().min(1).max(MAX_RESUME_CHARS),
  jobText: z.string().trim().min(1).max(MAX_JOB_CHARS),
});
export type AssessRequest = z.infer<typeof assessRequestSchema>;

export const criterionIdSchema = z.enum(["skills", "tasks", "experience", "industry", "education"]);
export type CriterionId = z.infer<typeof criterionIdSchema>;

const stepsSchema = z.number().int().min(1).max(5);

export const criterionResultSchema = z.object({
  id: criterionIdSchema,
  name: z.string(),
  /** False when the job does not state what it needs for this criterion. */
  stated: z.boolean(),
  /** Filled steps of the 5-step bar; null when not stated. */
  steps: stepsSchema.nullable(),
  sentence: z.string(),
});
export type CriterionResult = z.infer<typeof criterionResultSchema>;

export const assessResultSchema = z.object({
  kind: z.literal("result"),
  model: z.string(),
  overall: z.object({
    label: z.string(),
    steps: stepsSchema,
  }),
  /** Ordered from the strongest criterion to the weakest; unstated criteria last. */
  criteria: z.array(criterionResultSchema),
  tip: z.string().nullable(),
});
export type AssessResult = z.infer<typeof assessResultSchema>;

export const notJobPostingSchema = z.object({
  kind: z.literal("not_job_posting"),
  message: z.string(),
});
export type NotJobPosting = z.infer<typeof notJobPostingSchema>;

export const assessResponseSchema = z.discriminatedUnion("kind", [assessResultSchema, notJobPostingSchema]);
export type AssessResponse = z.infer<typeof assessResponseSchema>;

export const errorCodeSchema = z.enum([
  "bad_request",
  "too_large",
  "forbidden",
  "rate_limited",
  "daily_limit",
  "busy",
  "server_error",
]);
export type ErrorCode = z.infer<typeof errorCodeSchema>;

export const errorResponseSchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    message: z.string(),
    /** ISO time when the limit resets; the message contains TIME_PLACEHOLDER when set. */
    retryAt: z.string().optional(),
  }),
});
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
