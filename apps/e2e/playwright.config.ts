import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;

// Both playgrounds run in dev mode, because <Ghost> only measures there.
const playgrounds = [
  { name: "vite", port: 5173, cwd: "../playground-vite" },
  { name: "next", port: 3000, cwd: "../playground-next" },
];

// A window in every breakpoint range (Tailwind's), at its smallest width
// like `ghostly measure`: the playgrounds change their layout at each one.
// `base` is a real phone (touch, device pixel ratio), the others desktop.
const desktop = devices["Desktop Chrome"];
const atWidth = (width: number) => ({
  ...desktop,
  viewport: { ...desktop.viewport, width },
});
const screens = [
  { name: "mobile", device: devices["Pixel 7"] },
  { name: "sm", device: atWidth(640) },
  { name: "md", device: atWidth(768) },
  { name: "lg", device: atWidth(1024) },
  // Desktop Chrome is 1280 wide.
  { name: "desktop", device: desktop },
  { name: "2xl", device: atWidth(1536) },
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
