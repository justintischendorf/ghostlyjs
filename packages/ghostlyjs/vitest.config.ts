import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

// The measuring code reads the real layout (getClientRects,
// getComputedStyle). jsdom and happy-dom have no layout engine and return 0
// for every size, so these tests run in a real Chromium.
// A function: Vitest changes the object, so each project needs its own.
const browser = () => ({
  enabled: true,
  provider: playwright(),
  headless: true,
  instances: [{ browser: "chromium" as const }],
});

// Bundle React before the tests start. Otherwise Vite finds a module like
// `react/jsx-runtime` only while the tests run, bundles it and reloads the
// test page. That reload breaks a test file that is just starting ("failed
// to find the current suite"), mostly in CI, where there is no cache yet.
const optimizeDeps = {
  include: [
    "react",
    "react/jsx-runtime",
    "react/jsx-dev-runtime",
    "react-dom",
    "react-dom/client",
  ],
};

// <Ghost> only measures when `process.env.NODE_ENV` is "development". The
// bundler replaces that value while building, so it can't be changed inside
// a test: each mode gets its own project instead.
const nodeEnv = (mode: string) => ({
  "process.env.NODE_ENV": JSON.stringify(mode),
});

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "core",
          include: ["src/core/**/*.test.ts"],
          browser: browser(),
        },
      },
      {
        define: nodeEnv("development"),
        optimizeDeps,
        test: {
          name: "react-dev",
          include: ["src/react/**/*.test.tsx"],
          exclude: ["src/react/**/*.prod.test.tsx"],
          browser: browser(),
        },
      },
      {
        define: nodeEnv("production"),
        // JSX for production React; its dev helper `jsxDEV` doesn't exist
        // there.
        oxc: { jsx: { development: false } },
        optimizeDeps,
        test: {
          name: "react-prod",
          include: ["src/react/**/*.prod.test.tsx"],
          browser: browser(),
        },
      },
      // The `ghostly` command is a Node program, so its tests run in Node.
      {
        test: {
          name: "cli",
          include: ["src/cli/**/*.test.ts"],
          environment: "node",
        },
      },
    ],
  },
});
