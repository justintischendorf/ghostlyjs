import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;

// Both playgrounds run in dev mode, because <Ghost> only measures there.
const playgrounds = [
  { name: "vite", port: 5173, cwd: "../playground-vite" },
  { name: "next", port: 3000, cwd: "../playground-next" },
];

export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  // The runners have 4 cores; the default would use 2.
  workers: isCI ? 4 : undefined,
  forbidOnly: isCI,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    // The browser `ghostly measure` opens: the installed Chrome. Text is a
    // bit wider or narrower in Playwright's own Chromium on Linux, so the
    // stored skeletons would not fit there.
    channel: "chrome",
    trace: "retain-on-failure",
    // No pulse animation on the skeletons.
    reducedMotion: "reduce",
  },
  // Per playground: first `ghostly measure` writes its ghostly.json, on
  // this machine (text wraps a bit differently per OS). Then the checks:
  // on a real phone (touch, device pixel ratio), and in a desktop window
  // that the tests resize to every breakpoint.
  projects: playgrounds.flatMap((playground) => {
    const baseURL = `http://localhost:${playground.port}`;
    const measure = `${playground.name}-measure`;
    return [
      {
        name: measure,
        testMatch: "measure.spec.ts",
        use: { ...devices["Desktop Chrome"], baseURL },
      },
      ...[
        { name: "mobile", device: devices["Pixel 7"] },
        { name: "desktop", device: devices["Desktop Chrome"] },
      ].map((screen) => ({
        name: `${playground.name}-${screen.name}`,
        testIgnore: "measure.spec.ts",
        dependencies: [measure],
        use: { ...screen.device, baseURL },
      })),
    ];
  }),
  webServer: playgrounds.map((playground) => ({
    command: `bun run dev --port ${playground.port}`,
    cwd: playground.cwd,
    url: `http://localhost:${playground.port}`,
    // Locally, an already running `bun run dev` is used.
    reuseExistingServer: !isCI,
    timeout: 120_000,
  })),
});
