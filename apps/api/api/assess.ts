import { Redis } from "@upstash/redis";
import { allowedOrigins, ipHashSecret, limitConfig, redisConfig, typesafeConfig } from "../lib/config.js";
import { createAssessHandler, type Jev } from "../lib/handler.js";
import { createJev } from "../lib/jev.js";
import { createLimits, type Limits, upstashStore } from "../lib/limits.js";

let jev: Jev | undefined;
let limits: Limits | undefined;

// Clients are created on first use, so a missing variable returns a clean error instead of a crash.
const handler = createAssessHandler({
  jev: () => {
    const { apiKey, model } = typesafeConfig();
    jev ??= createJev(apiKey, model);
    return jev;
  },
  limits: () => {
    limits ??= createLimits(upstashStore(new Redis(redisConfig())), limitConfig());
    return limits;
  },
  ipHashSecret,
  allowedOrigins: allowedOrigins(),
});

export function OPTIONS(request: Request): Response {
  return handler.OPTIONS(request);
}

export function POST(request: Request): Promise<Response> {
  return handler.POST(request);
}
