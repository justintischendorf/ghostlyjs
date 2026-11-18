// Runs `ghostly measure` against the playground of the project (see
// playwright.config.ts), like a user would, and checks the ghostly.json it
// writes into the playground. The other tests run after it, against what
// it measured on this machine. The command taps every button, so it
// reaches every <Ghost>, also the ones that only show after a tap: in
// tabs, menus, dialogs, a sheet and an accordion, and in a dialog that
// opens by its URL (`?item=5`).

import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

const cli = join(
  dirname(fileURLToPath(import.meta.resolve("ghostlyjs/package.json"))),
  "dist/cli/index.js",
);

const BREAKPOINTS = ["2xl", "base", "lg", "md", "sm", "xl"];

// <Ghost>s that only show after a tap. If one is missing, the tapping
// broke, not the page.
const TAPPED = [
  // A tab
  "overview-people",
  "collection-chat",
  // A popover in the nav
  "nav-notifications",
  // A radio button that switches the view
  "collections-rows",
  // A dialog
  "collections-suggestions",
  // A dialog that keeps its state in the URL
  "cards-details",
  // A sheet, below lg only (a sidebar from lg on)
  "cards-summary",
  // A closed <details>
  "cards-accordion",
  // A button that shows more
  "account-2fa",
];

test("ghostly measure measures every page at every breakpoint", async ({
  baseURL,
}, testInfo) => {
  test.setTimeout(900_000);
  // "vite-measure": the folder of the Vite playground.
  const folder = fileURLToPath(
    new URL(
      `../../playground-${testInfo.project.name.split("-")[0]}/`,
      import.meta.url,
    ),
  );
  const file = join(folder, "ghostly.json");
  // The <Ghost>s of the playground, as committed.
  const playgroundGhosts = Object.keys(
    JSON.parse(readFileSync(file, "utf8")),
  ).sort();
  {
    const child = spawn(
      process.execPath,
      [
        cli,
        "measure",
        baseURL!,
        // No link points to it.
        "--pages",
        "/admin",
        // The pretend login of the account page.
        "--cookie",
        "session=playground",
        // Ghosts the playground no longer has are removed.
        "--prune",
      ],
      { cwd: folder },
    );
    let output = "";
    child.stdout.on("data", (chunk) => (output += chunk));
    child.stderr.on("data", (chunk) => (output += chunk));
    const code = await new Promise((done) => child.once("exit", done));
    expect(code, output).toBe(0);

    const data = JSON.parse(readFileSync(file, "utf8"));
    expect(Object.keys(data)).toEqual(playgroundGhosts);
    for (const name of TAPPED) expect(data, name).toHaveProperty(name);
    // Every breakpoint, plus widths inside one where the layout changes
    // ("base@390").
    for (const name of playgroundGhosts) {
      const breakpoints = new Set(
        Object.keys(data[name]).map((key) => key.split("@")[0]),
      );
      expect([...breakpoints].sort(), name).toEqual(BREAKPOINTS);
    }
    // Different layouts per width: the main column is narrower or wider at
    // every breakpoint, so each one has its own measurement.
    const hero = data["overview-hero"];
    expect(
      new Set(BREAKPOINTS.map((breakpoint) => hero[breakpoint].width)).size,
    ).toBe(BREAKPOINTS.length);
    // The quote next to the sign-in form only shows from lg on.
    const highlights = data["signin-highlights"];
    expect(highlights.base.boxes).toHaveLength(0);
    expect(highlights.lg.boxes.length).toBeGreaterThan(0);

    // Behind the login, and nobody logged out while tapping ("Log out",
    // "Sign out"): the account page was measured, not /signin.
    expect(output).toMatch(/\/account +6 ghosts/);
    // Never tapped: inside `data-ghostly-skip`.
    expect(data).not.toHaveProperty("account-cancelled");
    // Pages that load for real.
    expect(output).toMatch(/\/async +3 ghosts/);
    // A tap that only changes the query stays on the page, and `#top`
    // links are no pages either.
    expect(output).not.toContain("?item=");
    expect(output).not.toContain("?page=");
    // The playground's <Ghost> that never loads, on purpose, and the only
    // one not measured everywhere.
    expect(output).toContain('"edge-never-measured" never showed its content');
    expect(output).toContain("1 ghost not measured everywhere");
  }
  // The dev server picks up the new ghostly.json before the other tests.
  await new Promise((done) => setTimeout(done, 2000));
});
