import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;

// Both playgrounds run in dev mode, because <Ghost> only measures there.
const playgrounds = [
  { name: "vite", port: 5173, cwd: "../playground-vite" },
  { name: "next", port: 3000, cwd: "../playground-next" },
];

// A desktop and a phone window, so the skeletons are checked at two widths.
const screens = [
  { name: "desktop", device: devices["Desktop Chrome"] },
  { name: "mobile", device: devices["Pixel 7"] },
];

export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  forbidOnly: isCI,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    trace: "retain-on-failure",
    // No pulse animation on the skeletons.
    reducedMotion: "reduce",
  },
  projects: playgrounds.flatMap((playground) =>
    screens.map((screen) => ({
      name: `${playground.name}-${screen.name}`,
      use: {
        ...screen.device,
        baseURL: `http://localhost:${playground.port}`,
      },
    })),
  ),
  webServer: playgrounds.map((playground) => ({
    command: `bun run dev --port ${playground.port}`,
    cwd: playground.cwd,
    url: `http://localhost:${playground.port}`,
    // Locally, an already running `bun run dev` is used.
    reuseExistingServer: !isCI,
    timeout: 120_000,
  })),
});
