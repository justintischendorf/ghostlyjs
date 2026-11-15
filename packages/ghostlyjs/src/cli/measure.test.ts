// Tests for `ghostly measure`. The helpers are tested directly; the command
// runs as a real Node process (the built dist/cli/index.js, so run the build
// first) against a small server. Its pages act like <Ghost>: they send
// measurements to the collector's port, which the command catches. Opens a
// real browser (Chrome, Edge or Playwright's Chromium).

import { spawn } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { DEFAULT_BREAKPOINTS } from "../core/breakpoints";
import type { GhostBoxMeasurement } from "../core/types";
import { mergeMeasurements, pageOf, parseOptions, widthsOf } from "./measure";

const measured = (height: number): GhostBoxMeasurement => ({
  width: 100,
  height,
  boxes: [],
});

describe("parseOptions", () => {
  test("defaults", () => {
    expect(parseOptions(["http://localhost:3000"])).toEqual({
      url: "http://localhost:3000",
      pages: [],
      prune: false,
      maxPages: 50,
      wait: 3000,
    });
  });

  test("all options", () => {
    expect(
      parseOptions([
        "http://localhost:3000",
        "--pages",
        "/a, /b,",
        "--prune",
        "--max-pages",
        "5",
        "--wait",
        "100",
      ]),
    ).toMatchObject({
      pages: ["/a", "/b"],
      prune: true,
      maxPages: 5,
      wait: 100,
    });
  });

  test.each([
    [[], /Pass the URL/],
    [["a", "b"], /Pass the URL/],
    [["localhost:3000"], /not a URL/],
    [["ftp://localhost"], /not a URL/],
    [["http://localhost", "--max-pages", "0"], /--max-pages/],
    [["http://localhost", "--wait", "soon"], /--wait/],
    [["http://localhost", "--nope"], /Unknown option/],
  ])("rejects %j", (args, message) => {
    expect(() => parseOptions(args)).toThrow(message);
  });
});

describe("widthsOf", () => {
  test("the smallest width of each range, a phone for base", () => {
    expect(widthsOf(DEFAULT_BREAKPOINTS)).toEqual([
      { name: "base", width: 375 },
      { name: "sm", width: 640 },
      { name: "md", width: 768 },
      { name: "lg", width: 1024 },
      { name: "xl", width: 1280 },
      { name: "2xl", width: 1536 },
    ]);
  });

  test("base stays below a small first breakpoint", () => {
    expect(widthsOf({ tiny: 300 })[0]).toEqual({ name: "base", width: 299 });
  });

  test("without breakpoints, only base", () => {
    expect(widthsOf({})).toEqual([{ name: "base", width: 375 }]);
  });
});

describe("pageOf", () => {
  const origin = "http://localhost:3000";

  test.each([
    ["/feed", "/feed"],
    ["http://localhost:3000/feed?tab=new#top", "/feed?tab=new"],
    ["feed", "/feed"],
    ["https://example.com/feed", undefined],
    ["http://localhost:4000/feed", undefined],
    ["mailto:me@example.com", undefined],
  ])("%s → %s", (href, page) => {
    expect(pageOf(href, origin)).toBe(page);
  });
});

describe("mergeMeasurements", () => {
  const data = {
    kept: { base: measured(1) },
    card: { base: measured(2), lg: measured(3) },
  };

  test("new measurements win, other breakpoints stay", () => {
    expect(
      mergeMeasurements(
        data,
        { card: { lg: measured(4) } },
        { prune: false, seen: new Set(["card"]) },
      ),
    ).toEqual({
      card: { base: measured(2), lg: measured(4) },
      kept: { base: measured(1) },
    });
  });

  test("prune removes ghosts no page showed", () => {
    expect(
      mergeMeasurements(data, {}, { prune: true, seen: new Set(["card"]) }),
    ).toEqual({ card: data.card });
  });

  test("sorted by name and breakpoint", () => {
    const merged = mergeMeasurements(
      {},
      { b: { md: measured(1), base: measured(1) }, a: { base: measured(1) } },
      { prune: false, seen: new Set() },
    );
    expect(Object.keys(merged)).toEqual(["a", "b"]);
    expect(Object.keys(merged.b ?? {})).toEqual(["base", "md"]);
  });
});

// A page with <Ghost>-like elements. Each one in `send` measures after its
// delay (ms), only in the browser of `ghostly measure`; the measured width
// is the window width, so the test sees where it was measured. With
// `request`, they wait for that request first, like data from an API.
function ghostPage({
  ghosts = [] as string[],
  send = {} as Record<string, number>,
  links = [] as string[],
  breakpoints = '{"md":700}' as string | null,
  request = "",
  // Like <GhostlyProvider> in dev mode; a production build lacks the mark.
  dev = true,
}) {
  const mark = dev ? " data-ghostly-dev" : "";
  return `<!doctype html>
${breakpoints ? `<style data-ghostly-breakpoints='${breakpoints}'${mark}></style>` : ""}
${ghosts.map((name) => `<div data-ghost="${name}"></div>`).join("\n")}
${links.map((href) => `<a href="${href}">link</a>`).join("\n")}
<script>
  const sizes = ${breakpoints ?? JSON.stringify(DEFAULT_BREAKPOINTS)};
  const breakpoint = Object.entries(sizes)
    .filter(([, min]) => innerWidth >= min)
    .sort((a, b) => a[1] - b[1])
    .map(([name]) => name)
    .pop() ?? "base";
  const ready = ${request ? `fetch("${request}")` : "Promise.resolve()"};
  for (const [name, delay] of Object.entries(${JSON.stringify(send)})) {
    ready.then(() => setTimeout(() => {
      if (!("__ghostlyMeasure" in window)) return;
      fetch("http://localhost:6767", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          breakpoint,
          measurement: { width: innerWidth, height: 10, boxes: [] },
        }),
      });
    }, delay));
  }
</script>`;
}

const pages: Record<string, string> = {
  "/": ghostPage({
    ghosts: ["a", "late"],
    send: { a: 0, late: 1500 },
    links: [
      "/b",
      "/b#again",
      "/missing",
      "/file.txt",
      "https://example.com/outside",
    ],
  }),
  "/b": ghostPage({ ghosts: ["a", "never"], send: { a: 0 }, links: ["/"] }),
  "/hidden": ghostPage({ ghosts: ["hidden"], send: { hidden: 0 } }),
  // Like a production build: <Ghost>s, but no measurements.
  "/prod": ghostPage({ ghosts: ["a"], dev: false }),
  // The same without <GhostlyProvider>: production can't be told apart.
  "/prod-plain": ghostPage({ ghosts: ["a"], breakpoints: null }),
  // No <GhostlyProvider>: the default breakpoints.
  "/plain": ghostPage({ ghosts: ["a"], send: { a: 0 }, breakpoints: null }),
  "/empty": ghostPage({}),
  // Its data comes from a slow API.
  "/api-data": ghostPage({
    ghosts: ["data"],
    send: { data: 0 },
    request: "/api/slow",
  }),
};

let server: Server;
let origin: string;
const cli = resolve(import.meta.dirname, "../../dist/cli/index.js");

beforeAll(async () => {
  if (!existsSync(cli)) throw new Error(`${cli} is missing, run the build`);
  server = createServer((request, response) => {
    const path = request.url ?? "/";
    if (path === "/api/slow") {
      setTimeout(() => response.writeHead(200).end("{}"), 1000);
      return;
    }
    if (path === "/file.txt") {
      response.writeHead(200, { "Content-Type": "text/plain" }).end("file");
      return;
    }
    const page = pages[path];
    if (!page) {
      response.writeHead(404, { "Content-Type": "text/html" }).end("gone");
      return;
    }
    response.writeHead(200, { "Content-Type": "text/html" }).end(page);
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  origin = `http://localhost:${(server.address() as AddressInfo).port}`;
});

afterAll(() => server.close());

// Runs `ghostly measure` in a new temporary folder, optionally with an
// existing ghostly.json. With Node, or another runtime like Bun.
async function measure(
  args: string[],
  // The ghostly.json before; a string is written as it is (a broken file).
  existing?: object | string,
  runtime = process.execPath,
) {
  const folder = mkdtempSync(join(tmpdir(), "ghostly-measure-"));
  const file = join(folder, "ghostly.json");
  if (existing) {
    const text =
      typeof existing === "string" ? existing : JSON.stringify(existing);
    writeFileSync(file, text);
  }
  try {
    const child = spawn(runtime, [cli, "measure", ...args], {
      cwd: folder,
    });
    let output = "";
    child.stdout.on("data", (chunk) => (output += chunk));
    child.stderr.on("data", (chunk) => (output += chunk));
    const code = await new Promise((done) => child.once("exit", done));
    const text = existsSync(file) ? readFileSync(file, "utf8") : undefined;
    // Left as it was when broken (see "a broken ghostly.json").
    const data = text && text !== existing ? JSON.parse(text) : undefined;
    return { code, output, data };
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
}

// Concurrent: each test runs its own process and folder.
describe.concurrent("ghostly measure", { timeout: 60_000 }, () => {
  test("follows the links and measures every <Ghost> at every breakpoint", async () => {
    // Longer than "late" takes, which loads without a request.
    const { code, output, data } = await measure([origin, "--wait", "3500"]);
    expect(code).toBe(0);
    expect(output).toContain("base 375 · md 700");
    // At each breakpoint's width; also the one that loads late.
    const at = (width: number) => ({ width, height: 10, boxes: [] });
    expect(data).toEqual({
      a: { base: at(375), md: at(700) },
      late: { base: at(375), md: at(700) },
    });
    expect(output).toMatch(/\/ +2 ghosts/);
    expect(output).toMatch(/\/b +1 of 2 ghosts/);
    expect(output).toContain('"never" never showed its content');
    expect(output).toMatch(/\/missing +answered with 404/);
    expect(output).toMatch(/\/file\.txt +is not a page/);
    // The same page once, other sites never.
    expect(output.match(/\/b /g)).toHaveLength(1);
    expect(output).not.toContain("outside");
    expect(output).toContain("2 ghosts measured at 2 breakpoints");
    expect(output).toContain("1 ghost not measured everywhere");
  });

  test("--pages adds pages no link points to", async () => {
    const { data } = await measure([
      `${origin}/hidden`,
      "--pages",
      "/plain",
      "--max-pages",
      "2",
      "--wait",
      "500",
    ]);
    expect(Object.keys(data)).toEqual(["a", "hidden"]);
  });

  // Bun ignores `engines` and may run the command instead of Node.
  test("runs with Bun too", async () => {
    const { code, data } = await measure(
      [origin, "--max-pages", "1", "--wait", "300"],
      undefined,
      "bun",
    );
    expect(code).toBe(0);
    expect(Object.keys(data.a)).toEqual(["base", "md"]);
  });

  test("without <GhostlyProvider>, the default breakpoints", async () => {
    const { output, data } = await measure([`${origin}/plain`]);
    expect(output).toContain("base 375 · sm 640 · md 768");
    expect(Object.keys(data.a)).toEqual([
      "2xl",
      "base",
      "lg",
      "md",
      "sm",
      "xl",
    ]);
  });

  test("keeps the other ghosts, --prune removes them", async () => {
    const existing = {
      old: { base: measured(1) },
      a: { lg: measured(2) },
    };
    const args = [`${origin}/plain`, "--max-pages", "1"];

    const kept = await measure(args, existing);
    expect(Object.keys(kept.data)).toEqual(["a", "old"]);
    // Breakpoints of the file that weren't measured stay.
    expect(kept.data.a.lg).not.toEqual(measured(2));

    const pruned = await measure([...args, "--prune"], existing);
    expect(Object.keys(pruned.data)).toEqual(["a"]);
    expect(pruned.output).toContain('Removed 1 ghost no page showed: "old"');
  });

  test("waits for the app's requests, even longer than --wait", async () => {
    const { data } = await measure([
      `${origin}/api-data`,
      "--max-pages",
      "1",
      "--wait",
      "300",
    ]);
    expect(Object.keys(data.data)).toEqual(["base", "md"]);
  });

  test("--max-pages stops following links, --wait gives up on quiet pages", async () => {
    const { output, data } = await measure([
      origin,
      "--max-pages",
      "1",
      // Shorter than "late" takes.
      "--wait",
      "300",
    ]);
    expect(output).not.toMatch(/\/b /);
    expect(output).toContain("Stopped following links after 1 pages");
    expect(output).toContain('"late" never showed its content');
    expect(Object.keys(data)).toEqual(["a"]);
  });

  test("a production build: stops right away, writes nothing", async () => {
    const start = Date.now();
    const { code, output, data } = await measure([`${origin}/prod`]);
    expect(code).toBe(1);
    expect(output).toContain("This is a production build");
    expect(output).toContain("dev mode");
    // No page was measured (they would take seconds each).
    expect(output).not.toContain("never showed its content");
    expect(Date.now() - start).toBeLessThan(3000);
    expect(data).toBeUndefined();
  });

  test("no measurements without a provider: hints at dev mode", async () => {
    const { code, output, data } = await measure([
      `${origin}/prod-plain`,
      "--max-pages",
      "1",
      "--wait",
      "300",
    ]);
    expect(code).toBe(1);
    expect(output).toContain("No <Ghost> sent a measurement");
    expect(output).toContain("dev mode");
    expect(data).toBeUndefined();
  });

  test("an unknown option is named, without Node's long text", async () => {
    const { code, output } = await measure([origin, "--fast"]);
    expect(code).toBe(1);
    expect(output).toContain('Unknown option "--fast".');
    expect(output).not.toContain("positional argument");
    expect(output).toContain("ghostly --help");
  });

  test("no <Ghost> at all", async () => {
    const { code, output } = await measure([
      `${origin}/empty`,
      "--max-pages",
      "1",
      "--wait",
      "300",
    ]);
    expect(code).toBe(1);
    expect(output).toContain("No <Ghost> found on 1 page.");
    // Without <Ghost>s, the page needs no other widths.
    expect(output).toMatch(/\/empty +0 ghosts/);
  });

  test("the start page fails", async () => {
    const { code, output } = await measure([`${origin}/missing`]);
    expect(code).toBe(1);
    expect(output).toContain("answered with 404");
  });

  test("the app doesn't run", async () => {
    const { code, output } = await measure(["http://localhost:1"]);
    expect(code).toBe(1);
    expect(output).toContain(
      "Can't reach http://localhost:1. Is your dev server running?",
    );
  });

  test("a wrong call points to the help", async () => {
    const { code, output } = await measure([]);
    expect(code).toBe(1);
    expect(output).toContain("Pass the URL of your running app.");
    expect(output).toContain("ghostly --help");
  });

  test("a broken ghostly.json is an error, not a crash", async () => {
    const start = Date.now();
    const { code, output } = await measure([origin], "<<<<<<< HEAD\n");
    expect(code).toBe(1);
    // Before measuring any page, not after all of them.
    expect(Date.now() - start).toBeLessThan(3000);
    expect(output).toContain("ghostly.json is broken");
    expect(output).not.toContain("SyntaxError");
  });
});
