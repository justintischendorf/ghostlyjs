// `ghostly measure <url>`: opens every page of the running app in a headless
// browser and stores what each <Ghost> measures in `ghostly.json`.
//
// Per page, one window per breakpoint range, side by side. Each window
//   1. waits until the page loaded and its <Ghost>s show their content,
//   2. measures them across its range, exact to the pixel, so a layout
//      that changes inside the range (buttons that wrap at 390px) gets its
//      own measurement (see fit.ts and `sweep`),
//   3. taps everything that can be tapped (buttons, tabs, menus, dialogs,
//      accordions), one after the other, and measures each <Ghost> that
//      only shows up then, the same way. Links it finds, also in opened
//      menus, are measured as pages of their own.
// While tapping, the app can only read: every request that would change
// something (POST, PUT, PATCH, DELETE) is blocked, so "Delete account"
// deletes nothing.

import { parseArgs } from "node:util";

import { intro, log, outro } from "@clack/prompts";
import type {
  Browser,
  BrowserContext,
  BrowserType,
  Page,
  Request,
} from "playwright-core";

import { DEFAULT_BREAKPOINTS, rangesOf } from "../core/breakpoints";
import {
  MEASURE_ALL,
  MEASURE_FLAG,
  type GhostMeasureResult,
} from "../core/index";
import type { Breakpoints, GhostlyData, GhostlyEntry } from "../core/types";
import { CliError } from "./cli-error";
import { fits, measurementOf, type Sample, type Segment } from "./fit";
import {
  ghostlyFile,
  readGhostlyFile,
  sortByKey,
  writeGhostlyFile,
} from "./ghostly-file";
import { bar, header, progressLine, style } from "./style";

export type MeasureCommandOptions = {
  url: string;
  pages: string[];
  prune: boolean;
  maxPages: number;
  // Taps per page and window at most, so an endless chain (a "next" button
  // that always shows another one) ends.
  maxTaps: number;
  // Cookies every page gets, e.g. a login session, so pages behind a
  // login can be measured too.
  cookies: { name: string; value: string }[];
  // Quiet time (ms) after which the <Ghost>s still loading count as never
  // loading.
  wait: number;
};

// The smallest phones; below it, the skeletons of this width are used.
const PHONE_WIDTH = 320;
// The widest window measured; wider ones use the measurement of this width,
// which keeps growing with the window like the content.
const MAX_WIDTH = 1920;
const WINDOW_HEIGHT = 900;
// Longest time for a page to load, even if it keeps loading (polling).
const PAGE_TIMEOUT = 30_000;
// Longest time for tapping on one page in one window.
const TAP_TIMEOUT = 120_000;
// Width of the page column in the report.
const PATH_COLUMN = 14;
// Requests that only read. All others are blocked while tapping.
const READING = new Set(["GET", "HEAD", "OPTIONS"]);
// Never tapped or followed: it would end the login session.
const LOGOUT = /log[\s_-]*out|sign[\s_-]*out|abmelden|ausloggen/i;

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
        "max-taps": { type: "string", default: "100" },
        wait: { type: "string", default: "3000" },
        cookie: { type: "string", multiple: true, default: [] },
      },
    });
  } catch (error) {
    // Node's own text is long; the option is all the user needs.
    const { code, message } = error as { code?: string; message: string };
    const option = /'([^']+)'/.exec(message)?.[1];
    throw new CliError(
      code === "ERR_PARSE_ARGS_UNKNOWN_OPTION" && option
        ? `Unknown option "${option}".`
        : message,
      true,
    );
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
  const maxTaps = Number(values["max-taps"]);
  const wait = Number(values.wait);
  if (!Number.isInteger(maxPages) || maxPages < 1) {
    throw new CliError("--max-pages needs a whole number of at least 1.");
  }
  if (!Number.isInteger(maxTaps) || maxTaps < 0) {
    throw new CliError("--max-taps needs a whole number, 0 for no taps.");
  }
  if (!Number.isFinite(wait) || wait < 0) {
    throw new CliError("--wait needs a number of milliseconds.");
  }
  // "name=value"; the value may contain "=" itself.
  const cookies = values.cookie.map((cookie) => {
    const split = cookie.indexOf("=");
    const name = cookie.slice(0, split).trim();
    if (split < 0 || !name) {
      throw new CliError(`--cookie needs name=value, not "${cookie}".`);
    }
    return { name, value: cookie.slice(split + 1) };
  });
  return {
    url,
    pages: (values.pages ?? "")
      .split(",")
      .map((page) => page.trim())
      .filter(Boolean),
    prune: values.prune,
    maxPages,
    maxTaps,
    cookies,
    wait,
  };
}

// A breakpoint range as measured: every window width from `start` to
// `end`. Below the smallest breakpoint, from the smallest phones on.
export type MeasuredRange = { name: string; start: number; end: number };

export function measuredRangesOf(breakpoints: Breakpoints): MeasuredRange[] {
  const ranges = rangesOf(breakpoints);
  return ranges.map((range, index) => {
    const next = ranges[index + 1]?.min;
    const end = next === undefined ? Math.max(MAX_WIDTH, range.min) : next - 1;
    const start =
      index === 0 ? Math.max(1, Math.min(PHONE_WIDTH, end)) : range.min;
    return { name: range.name, start, end };
  });
}

// Path and query of a link to the app, or undefined for other sites and
// for logout links. The hash is dropped: it's the same page.
export function pageOf(href: string, origin: string): string | undefined {
  if (!URL.canParse(href, origin)) return undefined;
  const url = new URL(href, origin);
  if (url.origin !== origin) return undefined;
  if (LOGOUT.test(url.pathname)) return undefined;
  return url.pathname + url.search;
}

// The new measurements win; the other breakpoints of a <Ghost> stay. A
// breakpoint measured again loses all its old keys ("base@390" too), its
// layout may have changed elsewhere now. With `prune`, ghosts no page
// showed are removed.
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
    const remeasured = new Set(Object.keys(entry).map(breakpointPart));
    const kept = Object.entries(result[name] ?? {}).filter(
      ([key]) => !remeasured.has(breakpointPart(key)),
    );
    result[name] = sortByKey({ ...Object.fromEntries(kept), ...entry });
  }
  return sortByKey(result);
}

const breakpointPart = (key: string) => key.split("@")[0] ?? key;

// "1 ghost", "2 ghosts".
const plural = (count: number, word: string) =>
  `${count} ${word}${count === 1 ? "" : "s"}`;

export async function runMeasure(args: string[]): Promise<void> {
  console.log(header("ghostly measure"));
  intro("Measuring every page at every width");
  const options = parseOptions(args);
  const origin = new URL(options.url).origin;
  // A broken ghostly.json fails now, not after measuring every page.
  readGhostlyFile(ghostlyFile());

  try {
    await fetch(options.url);
  } catch {
    throw new CliError(
      `Can't reach ${options.url}. Is your dev server running?`,
    );
  }

  // Shows what is going on while measuring; in a terminal only.
  const progress = progressLine();
  // Ctrl+C: a closing line instead of errors from the closing browser.
  // Registered before the spinner's own handler, so this one runs first.
  process.once("SIGINT", () => {
    progress.hide();
    outro("Stopped");
    process.exit(130);
  });
  progress.show("Starting the browser");
  // Loaded only here, so `ghostly --help` starts without it.
  const { chromium } = await import("playwright-core");
  const browser = await launchBrowser(chromium).catch((error: unknown) => {
    progress.hide();
    throw error;
  });
  try {
    await measureApp(browser, origin, options, progress);
  } finally {
    // An error ends the output; the spinner must not stay above it.
    progress.hide();
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

// A fresh browser profile for each window: what tapping stores (a theme in
// localStorage, a collapsed sidebar) doesn't change the other windows or
// pages. With the cookies of the command line.
async function newContext(
  browser: Browser,
  origin: string,
  options: MeasureCommandOptions,
): Promise<BrowserContext> {
  const context = await browser.newContext();
  if (options.cookies.length > 0) {
    await context.addCookies(
      options.cookies.map((cookie) => ({ ...cookie, url: origin })),
    );
  }
  // Lets the app know (`isMeasuring()`) before any of its code runs, and
  // remembers when the page last changed, to know when it is done.
  await context.addInitScript(`
    window.${MEASURE_FLAG} = true;
    window.__ghostlyChanged = performance.now();
    new MutationObserver(() => {
      window.__ghostlyChanged = performance.now();
    }).observe(document, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    });
  `);
  return context;
}

async function measureApp(
  browser: Browser,
  origin: string,
  options: MeasureCommandOptions,
  progress: ReturnType<typeof progressLine>,
): Promise<void> {
  const start = pageOf(options.url, origin) ?? "/";
  progress.show("Reading the breakpoints");
  const { breakpoints, production } = await readBreakpoints(
    await newContext(browser, origin, options),
    origin + start,
  );
  // Known right away from <GhostlyProvider>; no need to visit every page.
  if (production) {
    throw new CliError(
      "This is a production build, and <Ghost> only measures in dev mode.\n" +
        "Start your dev server (e.g. `npm run dev`) and measure that.",
    );
  }
  const ranges = measuredRangesOf(breakpoints);
  progress.hide();

  log.info(
    `${style("cyan", origin)}\n` +
      style(
        "dim",
        ranges
          .map(({ name, start, end }) => `${name} ${start}–${end}`)
          .join(" · "),
      ),
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
  // Breakpoints each <Ghost> was measured at, on any page so far: one
  // that a page doesn't reach (a menu behind a dialog) may be measured on
  // another one.
  const measuredAt = new Map<string, Set<string>>();
  const fullyMeasured = (name: string) =>
    ranges.every((range) => measuredAt.get(name)?.has(range.name));

  for (const [index, path] of queue.entries()) {
    // One window per range, side by side; the progress shows how many are
    // done, e.g. "/feed  ▰▰▰▱▱▱  page 2 of 7". The number of pages grows
    // while links are found.
    let done = 0;
    const showProgress = () =>
      progress.show(
        `${path}  ${bar(done, ranges.length)}  ` +
          style("dim", `page ${index + 1} of ${queue.length}`),
      );
    showProgress();
    const visits = await Promise.all(
      ranges.map(async (range) => {
        const context = await newContext(browser, origin, options);
        try {
          return await visitPage(context, origin + path, range, options);
        } finally {
          await context.close();
          done++;
          showProgress();
        }
      }),
    );

    const ghosts = new Set<string>();
    let taps = 0;
    const error = visits.find((visit) => visit.error)?.error;
    for (const [step, visit] of visits.entries()) {
      const range = ranges[step];
      if (!range) continue;
      taps = Math.max(taps, visit.taps);
      for (const name of visit.ghosts) ghosts.add(name);
      for (const [name, entry] of visit.measured) {
        // The first page that measured a breakpoint keeps it: a <Ghost> on
        // pages with other data (the header of /groups/1, /groups/2, ...)
        // keeps the measurement of the first one, also when pages are
        // added. All keys of a breakpoint ("base", "base@390") from one
        // page, they belong together.
        const kept = measured[name] ?? {};
        const done = new Set(Object.keys(kept).map(breakpointPart));
        measured[name] = {
          ...kept,
          ...Object.fromEntries(
            Object.entries(entry).filter(
              ([key]) => !done.has(breakpointPart(key)),
            ),
          ),
        };
        const at = measuredAt.get(name) ?? new Set();
        measuredAt.set(name, at.add(range.name));
      }
      for (const link of visit.links) {
        const linked = pageOf(link, origin);
        if (!linked || queue.includes(linked)) continue;
        if (queue.length < options.maxPages) queue.push(linked);
        else skippedPages++;
      }
    }

    progress.hide();
    // At least two spaces, also after a path longer than the column.
    const column = `${path.padEnd(PATH_COLUMN - 2)}  `;
    if (error) {
      log.warn(`${column}${error}`);
      continue;
    }
    for (const name of ghosts) seen.add(name);
    // Problems of this page, one line per <Ghost> not measured everywhere
    // yet, on this page or before.
    const problems: string[] = [];
    for (const name of [...ghosts].sort()) {
      if (fullyMeasured(name)) continue;
      const at = measuredAt.get(name);
      const missing = ranges
        .map((range) => range.name)
        .filter((breakpoint) => !at?.has(breakpoint));
      problems.push(
        at
          ? `"${name}" not measured at ${missing.join(", ")}`
          : `"${name}" never showed its content`,
      );
    }
    const count = plural(ghosts.size, "ghost");
    const tapped = taps > 0 ? style("dim", ` · ${plural(taps, "tap")}`) : "";
    if (problems.length === 0) {
      log.success(`${column}${count}${tapped}`);
    } else {
      const shown = ghosts.size - problems.length;
      log.warn(
        `${column}${shown} of ${count}${tapped}\n` +
          problems.map((problem) => style("dim", problem)).join("\n"),
      );
    }
  }

  if (skippedPages > 0) {
    log.warn(
      `Stopped following links after ${options.maxPages} pages ` +
        style("dim", "(--max-pages)"),
    );
  }
  const names = Object.keys(measured);
  if (names.length === 0) {
    throw new CliError(
      seen.size === 0
        ? `No <Ghost> found on ${plural(queue.length, "page")}.`
        : "No <Ghost> could be measured. Is the app running in dev mode? " +
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

  const removed = Object.keys(before).filter((name) => !(name in data));
  if (removed.length > 0) {
    log.success(
      `Removed ${plural(removed.length, "ghost")} no page showed: ` +
        removed.map((name) => `"${name}"`).join(", "),
    );
  }
  // Counted at the end: a later page may have measured what one before
  // couldn't reach.
  const incomplete = [...seen].filter((name) => !fullyMeasured(name));
  if (incomplete.length > 0) {
    log.warn(
      `${plural(incomplete.length, "ghost")} not measured everywhere.\n` +
        style(
          "dim",
          "Is their content behind a page no link points to? Add it with --pages.",
        ),
    );
  }
  outro(
    `${plural(names.length, "ghost")} measured at ` +
      `${plural(ranges.length, "breakpoint")} → ${style("cyan", "ghostly.json")}`,
  );
}

// The breakpoints of the app's <GhostlyProvider>, or the defaults, and
// whether it is a production build (the provider marks dev mode). Without a
// provider that's unknown.
async function readBreakpoints(
  context: BrowserContext,
  url: string,
): Promise<{ breakpoints: Breakpoints; production: boolean }> {
  try {
    const page = await context.newPage();
    const response = await page.goto(url);
    if (response && response.status() >= 400) {
      throw new CliError(`${url} answered with ${response.status()}.`);
    }
    // Rendered by the app's code, which may need a moment (client
    // rendering).
    const tag = await page
      .waitForSelector("style[data-ghostly-breakpoints]", {
        state: "attached",
        timeout: 5000,
      })
      .catch(() => null);
    const value = await tag?.getAttribute("data-ghostly-breakpoints");
    return {
      breakpoints: value ? JSON.parse(value) : DEFAULT_BREAKPOINTS,
      production:
        !!tag && (await tag.getAttribute("data-ghostly-dev")) === null,
    };
  } finally {
    await context.close();
  }
}

type Visit = {
  error?: string;
  // Names of the <Ghost>s on the page.
  ghosts: Set<string>;
  // What each measured <Ghost> stores for this range, e.g. "base" and
  // "base@390".
  measured: Map<string, GhostlyEntry>;
  links: Set<string>;
  taps: number;
};

// What the window sees of the page right now.
type PageState = {
  // Every <Ghost>, loading or not.
  ghosts: string[];
  // The ones that show their content.
  shown: string[];
  fontsLoaded: boolean;
  // Milliseconds since the page last changed.
  sinceChange: number;
};

// Opens one page in one window, measures its <Ghost>s at every width of
// the range and taps everything (see the top of this file).
async function visitPage(
  context: BrowserContext,
  url: string,
  range: MeasuredRange,
  options: MeasureCommandOptions,
): Promise<Visit> {
  const page = await context.newPage();
  await page.setViewportSize({ width: range.start, height: WINDOW_HEIGHT });
  const visit: Visit = {
    ghosts: new Set(),
    measured: new Map(),
    links: new Set(),
    taps: 0,
  };
  let lastActivity = Date.now();
  // Requests of the app still loading; while one runs, the page isn't quiet.
  const loading = new Set<Request>();
  const activity = () => (lastActivity = Date.now());
  page.on("request", (request) => {
    loading.add(request);
    activity();
  });
  const finished = (request: Request) => {
    loading.delete(request);
    activity();
  };
  page.on("requestfinished", finished);
  page.on("requestfailed", finished);
  // A tap may open an alert, a new tab or a file picker: closed right away.
  page.on("dialog", (dialog) => void dialog.dismiss().catch(() => {}));
  page.on("popup", (popup) => void popup.close().catch(() => {}));

  const state = (): Promise<PageState> =>
    page.evaluate(() => {
      const ghosts = [...document.querySelectorAll("[data-ghost]")];
      const isSkeleton = (element: Element) =>
        element.matches(".ghostly-skeleton, .ghostly-placeholder");
      const changed = (window as unknown as { __ghostlyChanged?: number })
        .__ghostlyChanged;
      return {
        ghosts: ghosts.map((element) => element.getAttribute("data-ghost")!),
        shown: ghosts
          .filter((element) => !isSkeleton(element))
          .map((element) => element.getAttribute("data-ghost")!),
        fontsLoaded: document.fonts.status === "loaded",
        sinceChange: performance.now() - (changed ?? 0),
      };
    });

  // Opens the page and waits until every <Ghost> shows its content, or
  // until nothing happens on the page for a while.
  const load = async (): Promise<string | undefined> => {
    activity();
    const started = Date.now();
    const response = await page.goto(url, { timeout: PAGE_TIMEOUT });
    if (response && response.status() >= 400) {
      return `answered with ${response.status()}`;
    }
    // A link to a file (image, PDF), not to a page.
    if (
      !(response?.headers()["content-type"] ?? "text/html").includes("html")
    ) {
      return "is not a page";
    }
    while (Date.now() - started < PAGE_TIMEOUT) {
      const now = await state();
      const before = visit.ghosts.size;
      for (const name of now.ghosts) visit.ghosts.add(name);
      if (visit.ghosts.size !== before) activity();

      const quiet = Date.now() - lastActivity;
      const allShown =
        now.ghosts.length > 0 &&
        now.ghosts.every((name) => now.shown.includes(name));
      // All done; the short pause lets a late web font arrive.
      if (allShown && now.fontsLoaded && quiet >= 300) break;
      // Nothing happens anymore; what still loads counts as never loading.
      if (loading.size === 0 && quiet >= options.wait) break;
      await page.waitForTimeout(100);
    }
    return undefined;
  };

  // Waits until a tap is done: no request running and the page unchanged
  // for a moment. At most `--wait`.
  const settle = async (): Promise<void> => {
    const started = Date.now();
    await page.waitForTimeout(50);
    while (Date.now() - started < Math.max(options.wait, 500)) {
      const now = await state();
      for (const name of now.ghosts) visit.ghosts.add(name);
      if (
        loading.size === 0 &&
        now.sinceChange >= 150 &&
        Date.now() - lastActivity >= 150
      ) {
        return;
      }
      await page.waitForTimeout(50);
    }
  };

  // Measures the shown <Ghost>s not measured yet, at every width of the
  // range, and goes back to the first width.
  // A <Ghost> measured hidden (no space, e.g. in a sidebar hidden below lg)
  // is measured again once a tap shows it, or one of the same name.
  const measureNew = async (): Promise<void> => {
    const { shown } = await state();
    const hidden = new Set(
      [...visit.measured]
        .filter(([, entry]) => Object.values(entry).every(isEmpty))
        .map(([name]) => name),
    );
    const showing = new Set(
      hidden.size === 0
        ? []
        : (await measureAt(page, [...hidden]))
            .filter((result) => !isEmpty(result.measurement))
            .map((result) => result.name),
    );
    const names = [...new Set(shown)].filter(
      (name) => !visit.measured.has(name) || showing.has(name),
    );
    if (names.length === 0) return;
    for (const [name, entry] of await sweep(page, names, range)) {
      visit.measured.set(name, entry);
    }
  };

  // Links to pages, not to files (`download`) or to a place on this page
  // (`#top`): that one resolves to the current URL, also to a query a tap
  // added (`?item=3#top`), which is no page of its own.
  const collectLinks = async (): Promise<void> => {
    const links = await page.evaluate(() =>
      [
        ...document.querySelectorAll(
          'a[href]:not([download]):not([href^="#"])',
        ),
      ].map((link) => (link as HTMLAnchorElement).href),
    );
    for (const link of links) visit.links.add(link);
  };

  try {
    const error = await load();
    if (error) return { ...visit, error };
    await measureNew();
    await collectLinks();
    if (options.maxTaps > 0) {
      await tapEverything(page, url, options, {
        settle,
        load,
        measureNew,
        collectLinks,
        tapped: () => visit.taps++,
        navigated: (link) => visit.links.add(link),
      });
    }
    return visit;
  } catch (error) {
    return { ...visit, error: (error as Error).message.split("\n")[0] ?? "" };
  } finally {
    await page.close();
  }
}

// Content that takes no space: hidden at this width, or nothing at all.
const isEmpty = ({ width, height }: { width: number; height: number }) =>
  width === 0 || height === 0;

// Steps (px) between the widths measured first. Where a <Ghost> changes
// its layout between two of them, the exact width is searched in between.
const STEP = 8;

// Measures the given <Ghost>s across the range and turns the measurements
// into the entry for `ghostly.json` (see fit.ts): every STEP pixels, and
// where something changed, exact to the pixel by halving the step.
async function sweep(
  page: Page,
  names: string[],
  range: MeasuredRange,
): Promise<Map<string, GhostlyEntry>> {
  const segments = new Map<string, Segment[]>();
  const sampleAt = async (
    width: number,
    only: string[],
  ): Promise<Map<string, Sample>> => {
    await page.setViewportSize({ width, height: WINDOW_HEIGHT });
    const samples = new Map<string, Sample>();
    for (const result of await measureAt(page, only)) {
      // Two <Ghost>s with the same name: the first shown one counts. One
      // hidden at this width (the same summary in a sidebar and in a
      // sheet) takes no space and gives way to the other.
      const before = samples.get(result.name);
      if (
        before &&
        (!isEmpty(before.measurement) || isEmpty(result.measurement))
      )
        continue;
      samples.set(result.name, {
        width,
        measurement: result.measurement,
        parentWidth: result.parentWidth,
      });
    }
    return samples;
  };

  // Adds the samples of `name` up to `sample`. A jump between two samples
  // (a word that moves to the next line) only shows if a sample in between
  // is off the line from the segment's start to the new sample. So the
  // samples get at most twice as far from the start as the one before
  // (1, 2, 4, 8px after a new segment starts), and every jump of more than
  // the tolerance moves that one off the line. Where a sample doesn't fit,
  // the exact width is found by halving.
  const advance = async (name: string, sample: Sample) => {
    const list = segments.get(name)!;
    while (true) {
      const segment = list.at(-1)!;
      const first = segment[0]!;
      const last = segment.at(-1)!;
      if (last.width >= sample.width) return;
      const next = Math.min(
        sample.width,
        last.width + Math.max(1, last.width - first.width),
      );
      const probe =
        next === sample.width
          ? sample
          : (await sampleAt(next, [name])).get(name);
      if (probe && fits(segment, probe)) {
        segment.push(probe);
        continue;
      }
      // The first width in (low, high] that doesn't fit.
      let low = last.width;
      let high = next;
      let found = probe;
      while (high - low > 1) {
        const middle = Math.floor((low + high) / 2);
        const between = (await sampleAt(middle, [name])).get(name);
        if (between && fits(segment, between)) {
          segment.push(between);
          low = middle;
        } else {
          high = middle;
          found = between;
        }
      }
      if (!found || found.width !== high) {
        found = (await sampleAt(high, [name])).get(name);
      }
      // Gone at this width (the app removed it): it starts again later.
      if (!found) return;
      list.push([found]);
    }
  };

  for (let width = range.start; ; width = Math.min(width + STEP, range.end)) {
    const samples = await sampleAt(width, names);
    for (const [name, sample] of samples) {
      const list = segments.get(name);
      if (!list) segments.set(name, [[sample]]);
      else await advance(name, sample);
    }
    if (width >= range.end) break;
  }
  await page.setViewportSize({ width: range.start, height: WINDOW_HEIGHT });
  await measureAt(page, []);

  const entries = new Map<string, GhostlyEntry>();
  for (const [name, list] of segments) {
    const entry: GhostlyEntry = {};
    for (const [index, segment] of list.entries()) {
      const width = segment[0]?.width ?? range.start;
      // The first one is the breakpoint itself, also when the <Ghost> only
      // showed up at a larger width.
      const key = index === 0 ? range.name : `${range.name}@${width}`;
      entry[key] = measurementOf(segment);
    }
    entries.set(name, entry);
  }
  return entries;
}

// Waits two frames for the app to follow a new window width (media query
// listeners, ResizeObserver), then measures the shown <Ghost>s.
async function measureAt(
  page: Page,
  names: string[],
): Promise<GhostMeasureResult[]> {
  return page.evaluate(
    ([names, measureAll]) =>
      new Promise<GhostMeasureResult[]>((done) =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            const measure = (
              window as unknown as Record<
                string,
                ((names: string[]) => GhostMeasureResult[]) | undefined
              >
            )[measureAll];
            done(names.length > 0 && measure ? measure(names) : []);
          }),
        ),
      ),
    [names, MEASURE_ALL] as const,
  );
}

// Taps every element that reacts to a tap, newest first: what a tap opens
// (a menu, a dialog) is tapped before the rest of the page, so its buttons
// are reached while it is open. Each element once; elements that look the
// same (the "Delete" button of every row) count as one.
async function tapEverything(
  page: Page,
  url: string,
  options: MeasureCommandOptions,
  hooks: {
    settle: () => Promise<void>;
    load: () => Promise<string | undefined>;
    measureNew: () => Promise<void>;
    collectLinks: () => Promise<void>;
    tapped: () => void;
    navigated: (link: string) => void;
  },
): Promise<void> {
  // Only reading from now on.
  await page.route("**/*", (route) =>
    READING.has(route.request().method())
      ? route.fallback()
      : route.abort("blockedbyclient"),
  );
  const started = Date.now();
  const done = new Set<string>();
  // When each element showed up first: the number of taps before.
  const appeared = new Map<string, number>();
  let taps = 0;

  while (taps < options.maxTaps && Date.now() - started < TAP_TIMEOUT) {
    const candidates = await tappable(page);
    for (const { key } of candidates) {
      if (!appeared.has(key)) appeared.set(key, taps);
    }
    const open = candidates.filter(({ key }) => !done.has(key));
    if (open.length === 0) break;
    // The newest ones, in the order of the page.
    const newest = Math.max(...open.map(({ key }) => appeared.get(key) ?? 0));
    const next = open.find(({ key }) => appeared.get(key) === newest);
    if (!next) break;
    done.add(next.key);

    const target = page.locator(`[data-ghostly-tap="${next.id}"]`);
    // Something newer is still open (a menu, a dialog) and all of it was
    // tapped: close it first, as a user would.
    const present = Math.max(
      ...candidates.map(({ key }) => appeared.get(key) ?? 0),
    );
    if (newest < present) {
      await page.keyboard.press("Escape").catch(() => {});
      await hooks.settle();
    }
    try {
      await target.click({ timeout: 1000 });
    } catch {
      // Covered by something opened before (a dialog): close it, try again.
      await page.keyboard.press("Escape").catch(() => {});
      try {
        await target.click({ timeout: 1000 });
      } catch {
        debug(page, `can't tap ${next.key}`);
        continue;
      }
    }
    debug(page, `tapped ${next.key}`);
    taps++;
    hooks.tapped();
    await hooks.settle();
    // A menu that opens on hover (another menu was open) was opened by the
    // pointer and closed again by the tap: tap once more to open it.
    const expanded = await target
      .getAttribute("aria-expanded", { timeout: 200 })
      .catch(() => null);
    if (expanded === "false") {
      await target.click({ timeout: 1000 }).catch(() => {});
      await hooks.settle();
    }

    // The tap went to another page: that one is measured on its own. Only
    // another query (`?item=3`, a dialog or tab that keeps its state in
    // the URL) is the same page: what it shows is measured right here.
    if (new URL(page.url()).pathname !== new URL(url).pathname) {
      hooks.navigated(page.url());
      if (await hooks.load()) return;
      continue;
    }
    await hooks.measureNew();
    await hooks.collectLinks();
  }
}

// With GHOSTLY_DEBUG=1, what is tapped, per window width.
function debug(page: Page, message: string): void {
  if (!process.env.GHOSTLY_DEBUG) return;
  const width = page.viewportSize()?.width ?? 0;
  process.stderr.write(
    `[${width}] ${new URL(page.url()).pathname} ${message}\n`,
  );
}

// The elements on the page that do something when tapped, visible and
// enabled. Each gets a `data-ghostly-tap` id to tap it by, and a key that
// is the same for elements that look the same.
async function tappable(page: Page): Promise<{ id: string; key: string }[]> {
  return page.evaluate((logout) => {
    const selector = [
      "button",
      "summary",
      "input[type=checkbox]",
      "input[type=radio]",
      "[role=button]",
      "[role=tab]",
      "[role=menuitem]",
      "[role=menuitemcheckbox]",
      "[role=menuitemradio]",
      "[role=option]",
      "[role=combobox]",
      "[role=switch]",
      "[role=checkbox]",
      "[role=radio]",
      "[role=treeitem]",
      "[aria-haspopup]:not([aria-haspopup=false])",
      "[aria-expanded]",
    ].join(",");
    const pattern = new RegExp(logout, "i");
    // What the element says: its label or text, short.
    const labelOf = (element: HTMLElement) =>
      (
        element.getAttribute("aria-label") ||
        element.title ||
        element.innerText ||
        ""
      )
        .trim()
        .slice(0, 80);
    const counter = window as unknown as { __ghostlyTapId?: number };
    return [...document.querySelectorAll<HTMLElement>(selector)]
      .filter((element) => {
        // Links are pages of their own; skipped on purpose, or disabled.
        if (element.matches("a[href]")) return false;
        if (element.closest("[data-ghostly-skip]")) return false;
        if (
          (element as HTMLButtonElement).disabled ||
          element.closest("[aria-disabled=true], fieldset:disabled, [inert]")
        ) {
          return false;
        }
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return false;
        if (
          !element.checkVisibility({
            opacityProperty: true,
            visibilityProperty: true,
          })
        ) {
          return false;
        }
        const label = labelOf(element);
        return !pattern.test(label);
      })
      .map((element) => {
        element.dataset.ghostlyTap ??= String(
          (counter.__ghostlyTapId = (counter.__ghostlyTapId ?? 0) + 1),
        );
        const className =
          typeof element.className === "string" ? element.className : "";
        return {
          id: element.dataset.ghostlyTap,
          key: [
            element.localName,
            element.getAttribute("role") ?? "",
            labelOf(element),
            className.slice(0, 200),
          ].join("|"),
        };
      });
  }, LOGOUT.source);
}
