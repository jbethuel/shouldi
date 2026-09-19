import type { CounterStore } from "../lib/limits.js";

/** In-memory CounterStore for tests. Records expiry times so tests can check them. */
export function memoryStore() {
  const values = new Map<string, number>();
  const hashes = new Map<string, Map<string, number>>();
  const expiries = new Map<string, number>();

  const store: CounterStore = {
    async incr(key, expireAtSec) {
      const next = (values.get(key) ?? 0) + 1;
      values.set(key, next);
      expiries.set(key, expireAtSec);
      return next;
    },
    async decr(key) {
      values.set(key, (values.get(key) ?? 0) - 1);
    },
    async hincrby(key, field, by, expireAtSec) {
      const hash = hashes.get(key) ?? new Map<string, number>();
      hash.set(field, (hash.get(field) ?? 0) + by);
      hashes.set(key, hash);
      expiries.set(key, expireAtSec);
    },
    async hget(key, field) {
      return hashes.get(key)?.get(field) ?? 0;
    },
  };

  return { store, values, hashes, expiries };
}
