import type { Redis } from "@upstash/redis";
import { describe, expect, it, vi } from "vitest";
import { upstashStore } from "../lib/limits.js";

/** Records Redis calls. Each `multi()` returns a transaction whose commands run together on `exec()`. */
function fakeRedis(execResult: unknown[] = [1, 1], hgetResult: unknown = null) {
  const transactions: string[][] = [];
  const calls: string[] = [];
  const redis = {
    multi() {
      const commands: string[] = [];
      transactions.push(commands);
      const tx = {
        incr: (key: string) => (commands.push(`incr ${key}`), tx),
        expireat: (key: string, at: number) => (commands.push(`expireat ${key} ${at}`), tx),
        hincrby: (key: string, field: string, by: number) => (commands.push(`hincrby ${key} ${field} ${by}`), tx),
        exec: vi.fn(async () => execResult),
      };
      return tx;
    },
    decr: vi.fn(async (key: string) => (calls.push(`decr ${key}`), 0)),
    hget: vi.fn(async () => hgetResult),
  };
  return { redis: redis as unknown as Redis, transactions, calls };
}

describe("upstashStore", () => {
  it("increments and sets the expiry in one transaction, and returns the new count", async () => {
    const { redis, transactions } = fakeRedis([3, 1]);
    expect(await upstashStore(redis).incr("limit:id:day:abc", 1_790_000_000)).toBe(3);
    expect(transactions).toEqual([["incr limit:id:day:abc", "expireat limit:id:day:abc 1790000000"]]);
  });

  it("adds to a daily total and sets its expiry in one transaction", async () => {
    const { redis, transactions } = fakeRedis();
    await upstashStore(redis).hincrby("stats:day", "input_tokens", 2400, 1_790_000_000);
    expect(transactions).toEqual([["hincrby stats:day input_tokens 2400", "expireat stats:day 1790000000"]]);
  });

  it("decrements a key", async () => {
    const { redis, calls } = fakeRedis();
    await upstashStore(redis).decr("limit:ip:day:hash");
    expect(calls).toEqual(["decr limit:ip:day:hash"]);
  });

  it.each([
    [null, 0],
    ["1500", 1500],
    [1500, 1500],
  ])("reads a hash field %j as the number %d", async (stored, expected) => {
    const { redis } = fakeRedis([], stored);
    expect(await upstashStore(redis).hget("stats:day", "input_tokens")).toBe(expected);
  });
});
