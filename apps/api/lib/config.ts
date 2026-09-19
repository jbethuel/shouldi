import type { LimitConfig } from "./limits.js";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

function number(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function typesafeConfig() {
  return {
    apiKey: required("TYPESAFE_API_KEY"),
    model: process.env.TYPESAFE_MODEL?.trim() || "jev-latest",
  };
}

/** Accepts the Upstash names and the names that the Vercel Marketplace integration sets. */
export function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error("Missing Upstash Redis environment variables");
  return { url, token };
}

export function limitConfig(): LimitConfig {
  const dailyCostUsd = number("DAILY_COST_LIMIT_USD", 5);
  const usdPerMillionInputTokens = number("JEV_USD_PER_MILLION_INPUT_TOKENS", 0.042);
  return {
    perInstallPerDay: number("LIMIT_PER_INSTALL_PER_DAY", 50),
    perIpPerDay: number("LIMIT_PER_IP_PER_DAY", 200),
    dailyInputTokenCap: Math.floor((dailyCostUsd / usdPerMillionInputTokens) * 1_000_000),
    statsRetentionDays: number("STATS_RETENTION_DAYS", 90),
  };
}

export function ipHashSecret(): string {
  return required("IP_HASH_SECRET");
}

/** Comma-separated `chrome-extension://<id>` origins. Unset allows any extension (development only). */
export function allowedOrigins(): string[] | null {
  const raw = process.env.ALLOWED_ORIGINS?.trim();
  return raw ? raw.split(",").map((o) => o.trim()).filter(Boolean) : null;
}
