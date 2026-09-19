import { createHmac } from "node:crypto";
import type { Redis } from "@upstash/redis";

/** Minimal counter store so the limit logic can run against Redis or an in-memory fake. */
export interface CounterStore {
  /** Increment `key`, make it expire at `expireAtSec` (Unix seconds), and return the new value. */
  incr(key: string, expireAtSec: number): Promise<number>;
  decr(key: string): Promise<void>;
  hincrby(key: string, field: string, by: number, expireAtSec: number): Promise<void>;
  hget(key: string, field: string): Promise<number>;
}

export function upstashStore(redis: Redis): CounterStore {
  return {
    async incr(key, expireAtSec) {
      const [value] = await redis.multi().incr(key).expireat(key, expireAtSec).exec<[number, number]>();
      return value;
    },
    async decr(key) {
      await redis.decr(key);
    },
    async hincrby(key, field, by, expireAtSec) {
      await redis.multi().hincrby(key, field, by).expireat(key, expireAtSec).exec();
    },
    async hget(key, field) {
      return Number((await redis.hget<number | string>(key, field)) ?? 0);
    },
  };
}

export interface LimitConfig {
  perInstallPerDay: number;
  perIpPerDay: number;
  /** Daily cost cap, expressed in Jev input tokens. */
  dailyInputTokenCap: number;
  /** How long the anonymous daily totals stay in the store. */
  statsRetentionDays: number;
}

/** Daily totals. They never contain IDs, IP addresses, or text. */
export type StatField = "assessments" | "not_job_posting" | "errors" | "daily_limit" | "busy" | "input_tokens";

export type Reservation =
  | { ok: true; release: () => Promise<void> }
  | { ok: false; code: "daily_limit" | "busy"; retryAt: Date };

const DAY_SECONDS = 24 * 60 * 60;

export function utcDay(now: Date): string {
  return now.toISOString().slice(0, 10);
}

export function nextUtcMidnight(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
}

/** Keyed hash of the IP address; the address itself is never stored. Rotates daily. */
export function hashIp(ip: string, secret: string, day: string): string {
  return createHmac("sha256", secret).update(`${day}:${ip}`).digest("hex").slice(0, 32);
}

export function createLimits(store: CounterStore, config: LimitConfig) {
  const statsKey = (now: Date) => `stats:${utcDay(now)}`;
  const statsExpiry = (now: Date) =>
    Math.floor(nextUtcMidnight(now).getTime() / 1000) + (config.statsRetentionDays - 1) * DAY_SECONDS;

  return {
    /** Count one assessment against the install and IP limits, unless a limit is already reached. */
    async reserve(installId: string, ipHash: string, now: Date): Promise<Reservation> {
      const day = utcDay(now);
      const resetAt = nextUtcMidnight(now);

      const usedTokens = await store.hget(statsKey(now), "input_tokens");
      if (usedTokens >= config.dailyInputTokenCap) {
        return { ok: false, code: "busy", retryAt: resetAt };
      }

      // Rate-limit keys expire at the next 00:00 UTC, so they live less than 24 hours.
      const expireAt = Math.floor(resetAt.getTime() / 1000);
      const idKey = `limit:id:${day}:${installId}`;
      const ipKey = `limit:ip:${day}:${ipHash}`;
      const [idCount, ipCount] = await Promise.all([store.incr(idKey, expireAt), store.incr(ipKey, expireAt)]);
      const release = async () => {
        await Promise.all([store.decr(idKey), store.decr(ipKey)]);
      };

      if (idCount > config.perInstallPerDay || ipCount > config.perIpPerDay) {
        await release();
        return { ok: false, code: "daily_limit", retryAt: resetAt };
      }
      return { ok: true, release };
    },

    async count(field: StatField, now: Date, by = 1): Promise<void> {
      await store.hincrby(statsKey(now), field, by, statsExpiry(now));
    },
  };
}

export type Limits = ReturnType<typeof createLimits>;
