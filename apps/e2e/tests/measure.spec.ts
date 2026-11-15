// Runs `ghostly measure` against the playground of the project (see
// playwright.config.ts), like a user would, and checks the ghostly.json it
// writes. The playgrounds show their content right away for the command
// (`isMeasuring()`), so it reaches every <Ghost>.

import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

const cli = join(
  dirname(fileURLToPath(import.meta.resolve("ghostlyjs/package.json"))),
  "dist/cli/index.js",
);

// The <Ghost>s of the playgrounds (both have the same pages).
const playgroundGhosts = Object.keys(
  JSON.parse(
    readFileSync(
      fileURLToPath(
        new URL("../../playground-vite/ghostly.json", import.meta.url),
      ),
      "utf8",
    ),
  ),
).sort();

const BREAKPOINTS = ["2xl", "base", "lg", "md", "sm", "xl"];

test("ghostly measure measures every page at every breakpoint", async ({
  baseURL,
}, testInfo) => {
  // The command opens its own browser and windows; once per playground.
  test.skip(!testInfo.project.name.endsWith("desktop"), "once per playground");
  test.setTimeout(240_000);

  const folder = mkdtempSync(join(tmpdir(), "ghostly-e2e-"));
  try {
    const child = spawn(process.execPath, [cli, "measure", baseURL!], {
      cwd: folder,
    });
    let output = "";
    child.stdout.on("data", (chunk) => (output += chunk));
    child.stderr.on("data", (chunk) => (output += chunk));
    const code = await new Promise((done) => child.once("exit", done));
    expect(code, output).toBe(0);

    const data = JSON.parse(readFileSync(join(folder, "ghostly.json"), "utf8"));
    expect(Object.keys(data)).toEqual(playgroundGhosts);
    for (const name of playgroundGhosts) {
      expect(Object.keys(data[name]), name).toEqual(BREAKPOINTS);
    }
    // Different layouts per width: the playgrounds' content is narrower or
    // wider at every breakpoint, so each one has its own measurement.
    const hero = data["home-hero"];
    expect(
      new Set(BREAKPOINTS.map((breakpoint) => hero[breakpoint].width)).size,
    ).toBe(BREAKPOINTS.length);
    // And the cover next to the hero text only shows from lg on.
    expect(hero.lg.boxes.length).toBeGreaterThan(hero.md.boxes.length);
    // Also the ones that load for real.
    expect(output).toMatch(/\/async +2 ghosts/);
    // The playground's <Ghost> that never loads, on purpose.
    expect(output).toContain('"edge-never-measured" never showed its content');
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});
