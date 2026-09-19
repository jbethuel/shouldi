import { defineConfig } from "vitest/config";
import { WxtVitest } from "wxt/testing/vitest-plugin";

export default defineConfig({
  // WxtVitest replaces `wxt/browser` with an in-memory fake browser and applies wxt.config.ts.
  plugins: [WxtVitest()],
  test: {
    // Tests for single-file entry points live in test/, because WXT treats every file directly in entrypoints/ as an entry point.
    include: ["lib/**/*.test.ts", "entrypoints/**/*.test.{ts,tsx}", "test/**/*.test.ts"],
    restoreMocks: true,
    coverage: {
      include: ["lib/**", "entrypoints/**", "components/**"],
      exclude: ["**/*.test.*", "**/main.tsx", "**/*.html"],
    },
  },
});
