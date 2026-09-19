import { afterEach, describe, expect, it, vi } from "vitest";
import { allowedOrigins, ipHashSecret, limitConfig, redisConfig, typesafeConfig } from "../lib/config.js";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("typesafeConfig", () => {
  it("requires the API key and uses jev-latest by default", () => {
    vi.stubEnv("TYPESAFE_API_KEY", "  key  ");
    vi.stubEnv("TYPESAFE_MODEL", "");
    expect(typesafeConfig()).toEqual({ apiKey: "key", model: "jev-latest" });
  });

  it("uses the configured model", () => {
    vi.stubEnv("TYPESAFE_API_KEY", "key");
    vi.stubEnv("TYPESAFE_MODEL", "jev-1.13.0");
    expect(typesafeConfig().model).toBe("jev-1.13.0");
  });

  it("throws when the API key is missing or blank", () => {
    vi.stubEnv("TYPESAFE_API_KEY", "   ");
    expect(() => typesafeConfig()).toThrow("TYPESAFE_API_KEY");
  });
});

describe("redisConfig", () => {
  it("reads the Upstash variable names", () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://u.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "t1");
    expect(redisConfig()).toEqual({ url: "https://u.upstash.io", token: "t1" });
  });

  it("falls back to the names that the Vercel Marketplace integration sets", () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", undefined as never);
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", undefined as never);
    vi.stubEnv("KV_REST_API_URL", "https://kv.upstash.io");
    vi.stubEnv("KV_REST_API_TOKEN", "t2");
    expect(redisConfig()).toEqual({ url: "https://kv.upstash.io", token: "t2" });
  });

  it("throws when neither set is present", () => {
    for (const name of ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "KV_REST_API_URL", "KV_REST_API_TOKEN"]) {
      vi.stubEnv(name, undefined as never);
    }
    expect(() => redisConfig()).toThrow("Upstash");
  });
});

describe("limitConfig", () => {
  it("uses the agreed defaults: 50 per install, 200 per IP, $5 per day", () => {
    for (const name of ["LIMIT_PER_INSTALL_PER_DAY", "LIMIT_PER_IP_PER_DAY", "DAILY_COST_LIMIT_USD", "JEV_USD_PER_MILLION_INPUT_TOKENS", "STATS_RETENTION_DAYS"]) {
      vi.stubEnv(name, "");
    }
    expect(limitConfig()).toEqual({
      perInstallPerDay: 50,
      perIpPerDay: 200,
      dailyInputTokenCap: Math.floor((5 / 0.042) * 1_000_000),
      statsRetentionDays: 90,
    });
  });

  it("converts the daily dollar limit into input tokens at the configured price", () => {
    vi.stubEnv("DAILY_COST_LIMIT_USD", "1");
    vi.stubEnv("JEV_USD_PER_MILLION_INPUT_TOKENS", "0.5");
    expect(limitConfig().dailyInputTokenCap).toBe(2_000_000);
  });

  it("ignores values that are not positive numbers", () => {
    vi.stubEnv("LIMIT_PER_INSTALL_PER_DAY", "-3");
    vi.stubEnv("LIMIT_PER_IP_PER_DAY", "lots");
    expect(limitConfig()).toMatchObject({ perInstallPerDay: 50, perIpPerDay: 200 });
  });
});

describe("ipHashSecret", () => {
  it("is required", () => {
    vi.stubEnv("IP_HASH_SECRET", "");
    expect(() => ipHashSecret()).toThrow("IP_HASH_SECRET");
    vi.stubEnv("IP_HASH_SECRET", "s3cret");
    expect(ipHashSecret()).toBe("s3cret");
  });
});

describe("allowedOrigins", () => {
  it("parses a comma-separated list and ignores blanks", () => {
    vi.stubEnv("ALLOWED_ORIGINS", " chrome-extension://aaa , ,chrome-extension://bbb ");
    expect(allowedOrigins()).toEqual(["chrome-extension://aaa", "chrome-extension://bbb"]);
  });

  it("returns null when unset, which allows any extension origin (development)", () => {
    vi.stubEnv("ALLOWED_ORIGINS", "");
    expect(allowedOrigins()).toBeNull();
  });
});
