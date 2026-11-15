// `ghostly measure <url>`: opens every page of the running app in a headless
// browser, once per breakpoint, and stores what each <Ghost> measures in
// `ghostly.json`. <Ghost> measures itself as in `ghostly dev`; this command
// only catches the measurements it sends to the collector's port, so
// `ghostly dev` doesn't need to run.

import { parseArgs } from "node:util";

import type { Browser, BrowserContext, BrowserType } from "playwright-core";

import { DEFAULT_BREAKPOINTS, rangesOf } from "../core/breakpoints";
import { DEFAULT_PORT, MEASURE_FLAG } from "../core/index";
import type { Breakpoints, GhostlyData } from "../core/types";
import {
  ghostlyFile,
  isMeasurementMessage,
  readGhostlyFile,
  sortByKey,
  writeGhostlyFile,
} from "./ghostly-file";

// A message for the user instead of a stack trace.
export class CliError extends Error {
  showUsage: boolean;
  constructor(message: string, showUsage = false) {
    super(message);
    this.showUsage = showUsage;
  }
}

export type MeasureCommandOptions = {
  url: string;
  pages: string[];
  prune: boolean;
  maxPages: number;
  // Quiet time (ms) after which the <Ghost>s still loading count as never
  // loading.
  wait: number;
};

// The window width of phones, for the range below the smallest breakpoint.
const PHONE_WIDTH = 375;
const WINDOW_HEIGHT = 900;
// Longest time on one page, even if it keeps loading (e.g. polling).
const PAGE_TIMEOUT = 30_000;
// Width of the page column in the report.
const PATH_COLUMN = 14;

export function parseOptions(args: string[]): MeasureCommandOptions {
  let parsed;
  try {
    parsed = parseArgs({
      args,
      allowPositionals: true,
      options: {
        pages: { type: "string" },
        prune: { type: "boolean", default: false },
        "max-pages": { type: "string", default: "50" },
        wait: { type: "string", default: "3000" },
      },
    });
  } catch (error) {
    throw new CliError((error as Error).message, true);
  }
  const { positionals, values } = parsed;
  const [url] = positionals;
  if (!url || positionals.length > 1) {
    throw new CliError("Pass the URL of your running app.", true);
  }
  if (!URL.canParse(url) || !/^https?:$/.test(new URL(url).protocol)) {
    throw new CliError(`"${url}" is not a URL like http://localhost:3000.`);
  }
  const maxPages = Number(values["max-pages"]);
  const wait = Number(values.wait);
  if (!Number.isInteger(maxPages) || maxPages < 1) {
    throw new CliError("--max-pages needs a whole number of at least 1.");
  }
  if (!Number.isFinite(wait) || wait < 0) {
    throw new CliError("--wait needs a number of milliseconds.");
  }
  return {
    url,
    pages: (values.pages ?? "")
      .split(",")
      .map((page) => page.trim())
      .filter(Boolean),
    prune: values.prune,
    maxPages,
    wait,
  };
}

// The window width each range is measured at: its smallest width, where
// text wraps the most. Below the smallest breakpoint, a phone.
export function widthsOf(
  breakpoints: Breakpoints,
): { name: string; width: number }[] {
  const ranges = rangesOf(breakpoints);
  return ranges.map((range, index) => ({
    name: range.name,
    width:
      index === 0
        ? Math.max(1, Math.min(PHONE_WIDTH, (ranges[1]?.min ?? Infinity) - 1))
        : range.min,
  }));
}

// Path and query of a link to the app, or undefined for other sites. The
// hash is dropped: it's the same page.
export function pageOf(href: string, origin: string): string | undefined {
  if (!URL.canParse(href, origin)) return undefined;
  const url = new URL(href, origin);
  if (url.origin !== origin) return undefined;
  return url.pathname + url.search;
}

// The new measurements win; the other breakpoints of a <Ghost> stay. With
// `prune`, ghosts no page showed are removed.
export function mergeMeasurements(
  data: GhostlyData,
  measured: GhostlyData,
  { prune, seen }: { prune: boolean; seen: Set<string> },
): GhostlyData {
  const result: GhostlyData = {};
  for (const [name, entry] of Object.entries(data)) {
    if (!prune || seen.has(name)) result[name] = entry;
  }
  for (const [name, entry] of Object.entries(measured)) {
    result[name] = sortByKey({ ...result[name], ...entry });
  }
  return sortByKey(result);
}

export async function runMeasure(args: string[]): Promise<void> {
  const options = parseOptions(args);
  const origin = new URL(options.url).origin;

  try {
    await fetch(options.url);
  } catch {
    throw new CliError(
      `Can't reach ${options.url}. Is your dev server running?`,
    );
  }

  // Loaded only here, so `ghostly dev` starts without it.
  const { chromium } = await import("playwright-core");
  const browser = await launchBrowser(chromium);
  try {
    const context = await browser.newContext();
    // Lets the app know (`isMeasuring()`) before any of its code runs.
    await context.addInitScript(`window.${MEASURE_FLAG} = true;`);
    // No measurement may reach a running `ghostly dev`, not even from a page
    // that isn't measured (reading the breakpoints). The pages that are
    // measured catch them with their own route, which wins over this one.
    await context.route(isCollector, (route) => route.fulfill({ status: 204 }));
    await measureApp(context, origin, options);
  } finally {
    await browser.close();
  }
}

// The installed Chrome or Edge first, so nothing has to be downloaded.
// Otherwise the browser Playwright downloads.
async function launchBrowser(chromium: BrowserType): Promise<Browser> {
  for (const channel of ["chrome", "msedge", undefined]) {
    try {
      return await chromium.launch({ channel });
    } catch {
      // Not installed, try the next one.
    }
  }
  throw new CliError(
    "No Chrome or Edge found to open your pages.\n\n" +
      "  Install a browser for ghostly (~200 MB, once):\n" +
      "    npx playwright-core install chromium-headless-shell",
  );
}

async function measureApp(
  context: BrowserContext,
  origin: string,
  options: MeasureCommandOptions,
): Promise<void> {
  const start = pageOf(options.url, origin) ?? "/";
  const breakpoints = await readBreakpoints(context, origin + start);
  const widths = widthsOf(breakpoints);

  console.log(`ghostly measure  ${origin}`);
  console.log(
    `breakpoints      ${widths.map(({ name, width }) => `${name} ${width}`).join(" · ")}\n`,
  );

  const queue = [start];
  for (const page of options.pages) {
    const path = pageOf(page, origin);
    if (path && !queue.includes(path)) queue.push(path);
  }
  let skippedPages = 0;
  const measured: GhostlyData = {};
  // Every <Ghost> that showed up, measured or not.
  const seen = new Set<string>();
  const incomplete = new Set<string>();

  for (const path of queue) {
    const ghosts = new Set<string>();
    // Breakpoints each <Ghost> of this page was measured at.
    const measuredAt = new Map<string, Set<string>>();
    let error: string | undefined;

    for (const { width } of widths) {
      const visit = await visitPage(context, origin + path, width, options);
      if (visit.error) {
        error = visit.error;
        break;
      }
      for (const name of visit.ghosts) ghosts.add(name);
      for (const [name, { breakpoint, measurement }] of visit.measured) {
        ghosts.add(name);
        measured[name] = { ...measured[name], [breakpoint]: measurement };
        const at = measuredAt.get(name) ?? new Set();
        measuredAt.set(name, at.add(breakpoint));
      }
      for (const link of visit.links) {
        const linked = pageOf(link, origin);
        if (!linked || queue.includes(linked)) continue;
        if (queue.length < options.maxPages) queue.push(linked);
        else skippedPages++;
      }
      // A page without <Ghost>s needs no other widths.
      if (ghosts.size === 0) break;
    }

    if (error) {
      console.log(`  ${path.padEnd(PATH_COLUMN)} ⚠ ${error}`);
      continue;
    }
    for (const name of ghosts) seen.add(name);
    // Problems of this page, one line per <Ghost>.
    const problems: string[] = [];
    for (const name of [...ghosts].sort()) {
      const at = measuredAt.get(name);
      const missing = widths
        .map(({ name: breakpoint }) => breakpoint)
        .filter((breakpoint) => !at?.has(breakpoint));
      if (missing.length === 0) continue;
      incomplete.add(name);
      problems.push(
        at
          ? `"${name}" not measured at ${missing.join(", ")}`
          : `"${name}" never showed its content`,
      );
    }
    const done = ghosts.size - problems.length;
    const count = `${ghosts.size} ghost${ghosts.size === 1 ? "" : "s"}`;
    console.log(
      problems.length === 0
        ? `  ${path.padEnd(PATH_COLUMN)} ✓ ${count}`
        : `  ${path.padEnd(PATH_COLUMN)} ⚠ ${done} of ${count}`,
    );
    for (const problem of problems) console.log(`      ${problem}`);
  }

  if (skippedPages > 0) {
    console.log(
      `\n⚠ Stopped following links after ${options.maxPages} pages ` +
        "(--max-pages).",
    );
  }
  const names = Object.keys(measured);
  if (names.length === 0) {
    throw new CliError(
      seen.size === 0
        ? `No <Ghost> found on ${queue.length} page${queue.length === 1 ? "" : "s"}.`
        : "No <Ghost> sent a measurement. Is the app running in dev mode? " +
            "Production builds don't measure.",
    );
  }

  const file = ghostlyFile();
  const before = readGhostlyFile(file);
  const data = mergeMeasurements(before, measured, {
    prune: options.prune,
    seen,
  });
  writeGhostlyFile(file, data);

  console.log(
    `\n✓ ${names.length} ghost${names.length === 1 ? "" : "s"} measured ` +
      `at ${widths.length} breakpoints → ghostly.json`,
  );
  const removed = Object.keys(before).filter((name) => !(name in data));
  if (removed.length > 0) {
    console.log(
      `✓ removed ${removed.length} ghost${removed.length === 1 ? "" : "s"} ` +
        "no page showed: " +
        removed.map((name) => `"${name}"`).join(", "),
    );
  }
  if (incomplete.size > 0) {
    console.log(
      `⚠ ${incomplete.size} ghost${incomplete.size === 1 ? "" : "s"} not ` +
        "measured everywhere. Open them by hand with `ghostly dev` running.",
    );
  }
}

// The breakpoints of the app's <GhostlyProvider>, or the defaults.
async function readBreakpoints(
  context: BrowserContext,
  url: string,
): Promise<Breakpoints> {
  const page = await context.newPage();
  try {
    const response = await page.goto(url);
    if (response && response.status() >= 400) {
      throw new CliError(`${url} answered with ${response.status()}.`);
    }
    // Rendered by the app's code, which may need a moment (client
    // rendering).
    const style = await page
      .waitForSelector("style[data-ghostly-breakpoints]", {
        state: "attached",
        timeout: 5000,
      })
      .catch(() => null);
    const value = await style?.getAttribute("data-ghostly-breakpoints");
    return value ? JSON.parse(value) : DEFAULT_BREAKPOINTS;
  } finally {
    await page.close();
  }
}

type Visit = {
  error?: string;
  // Names of the <Ghost>s on the page.
  ghosts: Set<string>;
  measured: Map<
    string,
    { breakpoint: string; measurement: GhostlyData[string][string] }
  >;
  links: string[];
};

const isCollector = (url: URL) =>
  url.hostname === "localhost" && url.port === String(DEFAULT_PORT);

// Opens one page at one window width and waits until every <Ghost> on it
// measured itself, or until nothing happens on the page for a while.
async function visitPage(
  context: BrowserContext,
  url: string,
  width: number,
  options: MeasureCommandOptions,
): Promise<Visit> {
  const page = await context.newPage();
  await page.setViewportSize({ width, height: WINDOW_HEIGHT });
  const visit: Visit = { ghosts: new Set(), measured: new Map(), links: [] };
  let lastActivity = Date.now();
  // Requests of the app still loading; while one runs, the page isn't quiet.
  const loading = new Set<unknown>();

  try {
    // Answers in place of `ghostly dev`.
    await page.route(isCollector, async (route) => {
      const request = route.request();
      if (request.method() === "PATCH") {
        try {
          const message: unknown = JSON.parse(request.postData() ?? "");
          if (isMeasurementMessage(message)) {
            visit.measured.set(message.name, message);
            lastActivity = Date.now();
          }
        } catch {
          // Not a measurement.
        }
      }
      // Playwright answers the CORS preflight of a caught request itself.
      await route.fulfill({ status: 204 });
    });
    page.on("request", (request) => {
      if (isCollector(new URL(request.url()))) return;
      loading.add(request);
      lastActivity = Date.now();
    });
    const finished = (request: unknown) => {
      loading.delete(request);
      lastActivity = Date.now();
    };
    page.on("requestfinished", finished);
    page.on("requestfailed", finished);

    const started = Date.now();
    const response = await page.goto(url, { timeout: PAGE_TIMEOUT });
    if (response && response.status() >= 400) {
      return { ...visit, error: `answered with ${response.status()}` };
    }
    // A link to a file (image, PDF), not to a page.
    if (
      !(response?.headers()["content-type"] ?? "text/html").includes("html")
    ) {
      return { ...visit, error: "is not a page" };
    }

    while (Date.now() - started < PAGE_TIMEOUT) {
      const state = await page.evaluate(() => ({
        ghosts: [...document.querySelectorAll("[data-ghost]")].map(
          (element) => element.getAttribute("data-ghost") ?? "",
        ),
        fontsLoaded: document.fonts.status === "loaded",
      }));
      const before = visit.ghosts.size;
      for (const name of state.ghosts) visit.ghosts.add(name);
      if (visit.ghosts.size !== before) lastActivity = Date.now();

      const quiet = Date.now() - lastActivity;
      const allMeasured =
        visit.ghosts.size > 0 &&
        [...visit.ghosts].every((name) => visit.measured.has(name));
      // All done; the short pause lets a measurement after a late web font
      // arrive.
      if (allMeasured && state.fontsLoaded && quiet >= 300) break;
      // Nothing happens anymore; what still loads counts as never loading.
      if (loading.size === 0 && quiet >= options.wait) break;
      await page.waitForTimeout(100);
    }

    visit.links = await page.evaluate(() =>
      [...document.querySelectorAll("a[href]:not([download])")].map(
        (link) => (link as HTMLAnchorElement).href,
      ),
    );
    return visit;
  } catch (error) {
    return { ...visit, error: (error as Error).message.split("\n")[0] ?? "" };
  } finally {
    await page.close();
  }
}
