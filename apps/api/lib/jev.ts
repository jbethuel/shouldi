import { type Fetch, TypeSafeClient } from "@typesafe-ai/sdk";
import type { Jev } from "./handler.js";
import { questions } from "./questions.js";

/** `fetch` is for tests; production uses the global fetch. */
export function createJev(apiKey: string, model: string, options: { fetch?: Fetch } = {}): Jev {
  const client = new TypeSafeClient({
    apiKey,
    ...options,
    defaultModel: model,
    // Set explicitly so TYPESAFE_LOG_LEVEL=debug can never log request bodies (resume text).
    logLevel: "warn",
    timeout: 20_000,
    retry: { maxRetries: 1 },
  });

  return {
    async assess(state) {
      const result = await client.systemOne({
        state: { job: { text: state.job.text }, resume: { text: state.resume.text } },
        questions,
      });
      return { model: result.model, answers: result.answers, usage: result.usage };
    },
  };
}
