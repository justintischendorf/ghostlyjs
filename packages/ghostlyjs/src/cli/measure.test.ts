// Tests for `ghostly measure`. The helpers are tested directly; the command
// runs as a real Node process (the built dist/cli/index.js, so run the build
// first) against a small server. Its pages act like <Ghost>: they offer
// `window.__ghostlyMeasureAll`, which the command calls. Opens a real
// browser (Chrome, Edge or Playwright's Chromium).

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
import { measuredRangesOf, pageOf, parseOptions } from "./measure";

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
      maxPages: 50,
      maxTaps: 100,
      cookies: [],
      wait: 3000,
    });
  });

  test("all options", () => {
    expect(
      parseOptions([
        "http://localhost:3000",
        "--pages",
        "/a, /b,",
        "--max-pages",
        "5",
        "--max-taps",
        "0",
        "--wait",
        "100",
        "--cookie",
        "session=a=b",
        "--cookie",
        " theme =dark",
      ]),
    ).toMatchObject({
      pages: ["/a", "/b"],
      maxPages: 5,
      maxTaps: 0,
      cookies: [
        { name: "session", value: "a=b" },
        { name: "theme", value: "dark" },
      ],
      wait: 100,
    });
  });

  test.each([
    [[], /Pass the URL/],
    [["a", "b"], /Pass the URL/],
    [["localhost:3000"], /not a URL/],
    [["ftp://localhost"], /not a URL/],
    [["http://localhost", "--max-pages", "0"], /--max-pages/],
    [["http://localhost", "--max-taps", "-1"], /--max-taps/],
    [["http://localhost", "--wait", "soon"], /--wait/],
    [["http://localhost", "--cookie", "session"], /--cookie/],
    [["http://localhost", "--cookie", "=value"], /--cookie/],
    [["http://localhost", "--nope"], /Unknown option/],
  ])("rejects %j", (args, message) => {
    expect(() => parseOptions(args)).toThrow(message);
  });
});

describe("measuredRangesOf", () => {
  test("every width of each range, from the smallest phones", () => {
    expect(measuredRangesOf(DEFAULT_BREAKPOINTS)).toEqual([
      { name: "base", start: 320, end: 639 },
      { name: "sm", start: 640, end: 767 },
      { name: "md", start: 768, end: 1023 },
      { name: "lg", start: 1024, end: 1279 },
      { name: "xl", start: 1280, end: 1535 },
      { name: "2xl", start: 1536, end: 1920 },
    ]);
  });

  test("base stays below a small first breakpoint", () => {
    expect(measuredRangesOf({ tiny: 300 })[0]).toEqual({
      name: "base",
      start: 299,
      end: 299,
    });
  });

  test("without breakpoints, only base", () => {
    expect(measuredRangesOf({})).toEqual([
      { name: "base", start: 320, end: 1920 },
    ]);
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
    // It would end the login session.
    ["/logout", undefined],
    ["/auth/sign-out?next=/", undefined],
  ])("%s → %s", (href, page) => {
    expect(pageOf(href, origin)).toBe(page);
  });
});

// A page with <Ghost>-like elements, loading (a skeleton) at first. Each
// one in `send` shows its content after its delay (ms), only in the browser
// of `ghostly measure`, and can then be measured; its width is the window
// width, so the test sees where it was measured. With `request`, they wait
// for that request first, like data from an API. `body` adds HTML and
// script, e.g. buttons; its script can call `show(name)`.
function ghostPage({
  ghosts = [] as string[],
  send = {} as Record<string, number>,
  links = [] as string[],
  breakpoints = '{"md":700}' as string | null,
  request = "",
  // Like <GhostlyProvider> in dev mode; a production build lacks the mark.
  dev = true,
  body = "",
}) {
  const mark = dev ? " data-ghostly-dev" : "";
  return `<!doctype html>
<body style="margin: 0">
${breakpoints ? `<style data-ghostly-breakpoints='${breakpoints}'${mark}></style>` : ""}
${ghosts.map((name) => `<div data-ghost="${name}" class="ghostly-skeleton"></div>`).join("\n")}
${links.map((href) => `<a href="${href}">link</a>`).join("\n")}
<script>
  const shown = new Set();
  // How a <Ghost> measures; \`measures\` of the page can change it.
  const measures = {};
  window.__ghostlyMeasureAll = (names) =>
    [...shown]
      .filter((name) => !names || names.includes(name))
      .map((name) => ({
        name,
        measurement: measures[name]?.() ?? { width: innerWidth, height: 10, boxes: [] },
        parentWidth: innerWidth,
      }));
  function show(name) {
    if (!("__ghostlyMeasure" in window)) return;
    shown.add(name);
    document.querySelector(\`[data-ghost="\${name}"]\`)?.classList.remove("ghostly-skeleton");
  }
  const ready = ${request ? `fetch("${request}")` : "Promise.resolve()"};
  for (const [name, delay] of Object.entries(${JSON.stringify(send)})) {
    ready.then(() => setTimeout(() => show(name), delay));
  }
</script>
${body}`;
}

// What the app's server got that it never should while tapping.
const forbidden = { writes: 0, logouts: 0 };

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
  // Behind a login: without the session cookie, a redirect to "/empty".
  "/private": ghostPage({ ghosts: ["private"], send: { private: 0 } }),
  // Its data comes from a slow API.
  "/api-data": ghostPage({
    ghosts: ["data"],
    send: { data: 0 },
    request: "/api/slow",
  }),
  // Two buttons below each other, next to each other from 500px on: the
  // <Ghost> gets 40px less high there. And 3px later, a word moves up into
  // a line of text, which gets 40px longer.
  "/wrap": ghostPage({
    ghosts: ["wrap"],
    send: { wrap: 0 },
    body: `<script>
      measures.wrap = () => ({
        width: innerWidth,
        height: innerWidth < 500 ? 80 : 40,
        boxes: [{ x: 0, y: 0, width: innerWidth < 503 ? 100 : 140, height: 10, radius: 0 }],
      });
    </script>`,
  }),
  // A menu that only opens on a tap, with a <Ghost> and a link in it, and
  // buttons that must never do anything.
  "/menu": ghostPage({
    ghosts: ["a"],
    send: { a: 0 },
    body: `
      <button id="open">Menu</button>
      <button onclick="fetch('/api/delete', { method: 'POST' })">Delete account</button>
      <button onclick="fetch('/api/logout')">Log out</button>
      <button disabled onclick="fetch('/api/delete', { method: 'POST' })">Disabled</button>
      <div data-ghostly-skip><button onclick="fetch('/api/delete', { method: 'POST' })">Skipped</button></div>
      <script>
        document.querySelector("#open").onclick = () => {
          document.body.insertAdjacentHTML(
            "beforeend",
            '<div data-ghost="menu"></div><a href="/secret">secret</a>',
          );
          show("menu");
        };
      </script>`,
  }),
  "/secret": ghostPage({ ghosts: ["secret"], send: { secret: 0 } }),
  // A dialog that keeps its state in the URL: the tap only adds a query.
  "/query": ghostPage({
    ghosts: ["a"],
    send: { a: 0 },
    body: `
      <button id="details">Details</button>
      <a href="#top">Back to top</a>
      <script>
        document.querySelector("#details").onclick = () => {
          history.pushState(null, "", "/query?details=1");
          document.body.insertAdjacentHTML("beforeend", '<div data-ghost="details"></div>');
          show("details");
        };
      </script>`,
  }),
  // "shared" shows its content on /shown only; /hides has it loading
  // forever (like a menu a dialog covers). Each links to the other.
  "/shown": ghostPage({
    ghosts: ["shared"],
    send: { shared: 0 },
    links: ["/hides"],
  }),
  "/hides": ghostPage({ ghosts: ["shared"], links: ["/shown"] }),
  // The same <Ghost> twice: hidden in a sidebar (no space) and in a sheet
  // a tap opens.
  "/twin": ghostPage({
    ghosts: ["slip"],
    send: { slip: 0 },
    body: `
      <button id="open">Summary</button>
      <script>
        let open = false;
        measures.slip = () => ({ width: 0, height: 0, boxes: [] });
        const sidebar = window.__ghostlyMeasureAll;
        window.__ghostlyMeasureAll = (names) => [
          ...sidebar(names),
          ...(open && (!names || names.includes("slip"))
            ? [{ name: "slip", measurement: { width: innerWidth, height: 30, boxes: [] }, parentWidth: innerWidth }]
            : []),
        ];
        document.querySelector("#open").onclick = () => {
          open = true;
          document.body.insertAdjacentHTML("beforeend", "<p>sheet</p>");
        };
      </script>`,
  }),
  // The same <Ghost> with other data on two pages, like a detail page.
  "/first": ghostPage({
    ghosts: ["detail"],
    send: { detail: 0 },
    links: ["/second"],
  }),
  "/second": ghostPage({
    ghosts: ["detail"],
    send: { detail: 0 },
    body: `<script>
      measures.detail = () => ({ width: innerWidth, height: 20, boxes: [] });
    </script>`,
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
    if (path === "/api/delete" || path === "/api/logout") {
      if (path === "/api/delete") forbidden.writes++;
      else forbidden.logouts++;
      response.writeHead(204).end();
      return;
    }
    if (path === "/file.txt") {
      response.writeHead(200, { "Content-Type": "text/plain" }).end("file");
      return;
    }
    if (path === "/private" && request.headers.cookie !== "session=a=b") {
      response.writeHead(302, { Location: "/empty" }).end();
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
    // Unchanged (e.g. still broken) when nothing was written.
    const data = text && text !== existing ? JSON.parse(text) : undefined;
    return { code, output, data };
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
}

// Concurrent: each test runs its own process and folder.
describe.concurrent("ghostly measure", { timeout: 60_000 }, () => {
  test("follows the links and measures every <Ghost> at every width", async () => {
    // Longer than "late" takes, which loads without a request.
    const { code, output, data } = await measure([origin, "--wait", "3500"]);
    expect(code).toBe(0);
    expect(output).toContain("base 320–699 · md 700–1920");
    // From each range's first width on, growing with the window: its width
    // is the window width, 100% of its parent.
    const at = (width: number) => ({
      width,
      height: 10,
      boxes: [],
      fluid: true,
      widthCalc: [0, 100],
    });
    expect(data).toEqual({
      a: { base: at(320), md: at(700) },
      late: { base: at(320), md: at(700) },
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

  test("a layout that changes inside a range gets its own width", async () => {
    const { data } = await measure([`${origin}/wrap`, "--max-pages", "1"]);
    expect(Object.keys(data.wrap)).toEqual([
      "base",
      "base@500",
      "base@503",
      "md",
    ]);
    expect(data.wrap.base.height).toBe(80);
    expect(data.wrap["base@500"]).toMatchObject({ width: 500, height: 40 });
  });

  test("taps everything: a menu's <Ghost> and links are measured", async () => {
    const { code, output, data } = await measure([
      `${origin}/menu`,
      "--max-pages",
      "2",
    ]);
    expect(code).toBe(0);
    expect(Object.keys(data)).toEqual(["a", "menu", "secret"]);
    expect(Object.keys(data.menu)).toEqual(["base", "md"]);
    expect(output).toMatch(/\/menu +2 ghosts · \d+ taps/);
    // Nothing was written, nobody logged out, skipped is skipped.
    expect(forbidden).toEqual({ writes: 0, logouts: 0 });
  });

  test("a tap that only changes the query is measured on the same page", async () => {
    const { code, output, data } = await measure([
      `${origin}/query`,
      "--max-pages",
      "1",
    ]);
    expect(code).toBe(0);
    expect(Object.keys(data)).toEqual(["a", "details"]);
    expect(Object.keys(data.details)).toEqual(["base", "md"]);
    // Not a page of its own.
    expect(output).not.toContain("?details=1");
    expect(output).not.toContain("Stopped following links");
  });

  test("a <Ghost> measured on another page is measured everywhere", async () => {
    const args = ["--max-pages", "2", "--wait", "300"];
    // Measured on the first page: the second one has nothing to report.
    const first = await measure([`${origin}/shown`, ...args]);
    expect(first.output).toMatch(/\/hides +1 ghost/);
    expect(first.output).not.toContain("never showed its content");
    // Measured on the second page only: the first one reports what it
    // saw, but in the end nothing is missing.
    const second = await measure([`${origin}/hides`, ...args]);
    expect(second.output).toContain('"shared" never showed its content');
    expect(second.output).not.toContain("not measured everywhere");
    expect(Object.keys(second.data.shared)).toEqual(["base", "md"]);
  });

  test("a <Ghost> measured hidden is measured again once a tap shows it", async () => {
    const { data } = await measure([`${origin}/twin`, "--max-pages", "1"]);
    expect(data.slip.base.height).toBe(30);
    expect(data.slip.md.height).toBe(30);
  });

  test("the first page that measured a <Ghost> keeps it", async () => {
    const { data } = await measure([`${origin}/first`, "--max-pages", "2"]);
    expect(data.detail.base.height).toBe(10);
    expect(data.detail.md.height).toBe(10);
  });

  test("--max-taps 0 taps nothing", async () => {
    const { data } = await measure([
      `${origin}/menu`,
      "--max-pages",
      "2",
      "--max-taps",
      "0",
    ]);
    expect(Object.keys(data)).toEqual(["a"]);
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

  test("--cookie reaches pages behind a login", async () => {
    const args = [`${origin}/private`, "--wait", "500"];
    const { data } = await measure([...args, "--cookie", "session=a=b"]);
    expect(Object.keys(data)).toEqual(["private"]);
    const without = await measure(args);
    expect(without.output).toContain("No <Ghost> found");
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
    expect(output).toContain("base 320–639 · sm 640–767 · md 768–1023");
    expect(Object.keys(data.a)).toEqual([
      "2xl",
      "base",
      "lg",
      "md",
      "sm",
      "xl",
    ]);
  });

  test("builds ghostly.json anew: nothing old stays", async () => {
    const existing = {
      old: { base: measured(1) },
      a: { lg: measured(2), "lg@1100": measured(3) },
    };
    const { data, output } = await measure([`${origin}/plain`], existing);
    expect(Object.keys(data)).toEqual(["a"]);
    // Measured again, the old widths inside a breakpoint are gone too.
    expect(data.a.lg).not.toEqual(measured(2));
    expect(data.a).not.toHaveProperty("lg@1100");
    expect(output).toContain('Removed 1 ghost no page showed: "old"');
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
    const { code, output, data } = await measure([`${origin}/prod`]);
    expect(code).toBe(1);
    expect(output).toContain("This is a production build");
    expect(output).toContain("dev mode");
    // Stopped before measuring: no line with the breakpoints' widths, no
    // page reported. Not timed, because starting the browser alone takes
    // seconds on slow machines like CI.
    expect(output).not.toContain(" · ");
    expect(output).not.toContain("never showed its content");
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
    expect(output).toContain("No <Ghost> could be measured");
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

  test("a broken ghostly.json is replaced", async () => {
    const { code, data } = await measure([`${origin}/plain`], "<<<<<<< HEAD\n");
    expect(code).toBe(0);
    expect(Object.keys(data)).toEqual(["a"]);
  });
});
