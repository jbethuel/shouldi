import { describe, expect, it } from "vitest";
import { createLimits, hashIp, nextUtcMidnight } from "../lib/limits.js";
import { memoryStore } from "./memory-store.js";

const config = { perInstallPerDay: 2, perIpPerDay: 3, dailyInputTokenCap: 1000, statsRetentionDays: 90 };
const now = new Date("2026-09-19T15:30:00Z");
const midnight = new Date("2026-09-20T00:00:00Z");

describe("limits", () => {
  it("allows requests up to the per-install limit, then returns daily_limit with the next UTC midnight", async () => {
    const { store } = memoryStore();
    const limits = createLimits(store, config);
    expect((await limits.reserve("id-1", "ip-a", now)).ok).toBe(true);
    expect((await limits.reserve("id-1", "ip-a", now)).ok).toBe(true);
    expect(await limits.reserve("id-1", "ip-a", now)).toEqual({ ok: false, code: "daily_limit", retryAt: midnight });
  });

  it("applies the per-IP limit across install IDs", async () => {
    const { store } = memoryStore();
    const limits = createLimits(store, config);
    for (const id of ["a", "b", "c"]) expect((await limits.reserve(id, "ip-a", now)).ok).toBe(true);
    expect(await limits.reserve("d", "ip-a", now)).toMatchObject({ ok: false, code: "daily_limit" });
  });

  it("does not count a blocked request against the other key", async () => {
    const { store, values } = memoryStore();
    const limits = createLimits(store, config);
    await limits.reserve("id-1", "ip-a", now);
    await limits.reserve("id-1", "ip-a", now);
    await limits.reserve("id-1", "ip-a", now); // blocked by the install limit
    expect(values.get("limit:ip:2026-09-19:ip-a")).toBe(2);
  });

  it("gives the quota back when a reservation is released", async () => {
    const { store } = memoryStore();
    const limits = createLimits(store, config);
    const first = await limits.reserve("id-1", "ip-a", now);
    if (!first.ok) throw new Error("expected ok");
    await first.release();
    expect((await limits.reserve("id-1", "ip-a", now)).ok).toBe(true);
    expect((await limits.reserve("id-1", "ip-a", now)).ok).toBe(true);
  });

  it("returns busy when the daily token cap is reached", async () => {
    const { store } = memoryStore();
    const limits = createLimits(store, config);
    await limits.count("input_tokens", now, 1000);
    expect(await limits.reserve("id-1", "ip-a", now)).toEqual({ ok: false, code: "busy", retryAt: midnight });
  });

  it("expires rate-limit keys at the next UTC midnight", async () => {
    const { store, expiries } = memoryStore();
    const limits = createLimits(store, config);
    await limits.reserve("id-1", "ip-a", now);
    expect(expiries.get("limit:id:2026-09-19:id-1")).toBe(midnight.getTime() / 1000);
    expect(expiries.get("limit:ip:2026-09-19:ip-a")).toBe(midnight.getTime() / 1000);
  });
});

describe("nextUtcMidnight", () => {
  it("rolls over month ends", () => {
    expect(nextUtcMidnight(new Date("2026-09-30T23:59:59Z"))).toEqual(new Date("2026-10-01T00:00:00Z"));
  });
});

describe("hashIp", () => {
  it("never contains the IP address and changes with the day", () => {
    const a = hashIp("203.0.113.7", "secret", "2026-09-19");
    const b = hashIp("203.0.113.7", "secret", "2026-09-20");
    expect(a).not.toContain("203.0.113.7");
    expect(a).toHaveLength(32);
    expect(a).not.toBe(b);
  });
});
