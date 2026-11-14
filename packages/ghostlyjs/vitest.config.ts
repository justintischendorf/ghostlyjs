import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

// The measuring code reads the real layout (getClientRects,
// getComputedStyle). jsdom and happy-dom have no layout engine and return 0
// for every size, so the tests run in a real Chromium instead.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      instances: [{ browser: "chromium" }],
    },
  },
});
