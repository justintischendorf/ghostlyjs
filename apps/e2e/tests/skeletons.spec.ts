// Compares each skeleton with the content it stands for: the skeleton must
// sit exactly where the content was, and every box must cover the same
// part. Runs against both playgrounds (see playwright.config.ts).
//
// The skeletons come from a fresh measurement, not from `ghostly.json`: in
// dev mode a <Ghost> measures its content when it is shown and keeps that
// measurement for its skeleton. So the test checks measuring and drawing,
// and an outdated `ghostly.json` doesn't make it fail.

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test, type Locator, type Page } from "@playwright/test";

// /async loads for real and has no toggle; it has its own test below.
const paths = ["/", "/feed", "/dashboard", "/form", "/layouts", "/edge-cases"];

// Allowed difference in pixels. Measurements are rounded to one decimal,
// and the skeleton turns some of them into percentages.
const TOLERANCE = 1;

type Rect = { x: number; y: number; width: number; height: number };
type Box = Rect & { rotate?: number };
type Frame = Rect & { boxes: Box[] };

// The content of one <Ghost>, measured both ways, because only the
// skeletons show whether it is a list (<Ghost count>).
type Content = {
  name: string;
  label: string;
  // All children measured as one frame (a normal <Ghost>).
  whole: Frame;
  // Only the first item (a list), and the frames of all items.
  firstItem: Frame;
  items: Rect[];
};

// One drawn skeleton; `null` frame for a placeholder (never measured).
type Skeleton = { name: string; frame: Frame | null };

// The built measuring code of `ghostlyjs/core`, made available to the page
// as `window.ghostlyTest`. `measureFrame` is not exported, but the bundle
// keeps its name, so the test uses the library's own idea of the frame.
const measuringScript = `(() => {
${measuringCode().replace(
  /^export \{.*\};?$/m,
  "window.ghostlyTest = { measureElement, measureFrame };",
)}
})();`;

// The file with the code. The build moves code that `ghostlyjs/core` and
// `ghostlyjs` share into a chunk file; then the entry only re-exports it.
function measuringCode(): string {
  const entry = fileURLToPath(import.meta.resolve("ghostlyjs/core"));
  const code = readFileSync(entry, "utf8");
  const chunk = /^export \{.*\} from "(\.[^"]+)";?$/m.exec(code)?.[1];
  return chunk ? readFileSync(resolve(dirname(entry), chunk), "utf8") : code;
}

declare global {
  interface Window {
    ghostlyTest: {
      measureElement: (
        root: Element,
        options?: { list?: boolean },
      ) => { width: number; height: number; boxes: Box[] };
      measureFrame: (nodes: Node[]) => DOMRect;
    };
  }
}

// The <Ghost count> lists in the playgrounds. Named here, because a list
// can look like a normal <Ghost>: in a single column, one skeleton for the
// whole list would sit right too, but show the wrong number of items.
const LISTS = new Set(["home-members", "async-client-posts"]);

// What <Ghost> renders: a wrapper around shown content, or its skeletons.
// `data-ghost` holds the name.
const SKELETON = ".ghostly-skeleton, .ghostly-placeholder";

// Hydration errors React reports during a test. The server doesn't know the
// window width, so it must render the same skeletons as the browser.
let hydrationErrors: string[] = [];

test.beforeEach(async ({ page }) => {
  // Never reach a running `ghostly dev`: it would store the measurements of
  // this test (e.g. in a phone window) in `ghostly.json`.
  await page.route("http://localhost:6767/**", (route) => route.abort());

  hydrationErrors = [];
  const collect = (text: string) => {
    if (/hydrat/i.test(text)) hydrationErrors.push(text);
  };
  page.on("console", (message) => {
    if (message.type() === "error") collect(message.text());
  });
  page.on("pageerror", (error) => collect(error.message));
});

test.afterEach(() => {
  expect(hydrationErrors, "hydration errors").toEqual([]);
});

for (const path of paths) {
  test(`skeletons match the content on ${path}`, async ({ page }) => {
    await page.goto(path);
    await loadAllFonts(page);

    await toggle(page, "Show content");
    await page.addScriptTag({ content: measuringScript });
    const contents = await measureContents(page.locator("body"));

    await toggle(page, "Show skeletons");
    const skeletons = await measureSkeletons(page.locator("body"));

    expectSkeletonsMatch(contents, skeletons);
  });
}

// The skeleton switches with CSS when the window gets narrower or wider:
// measured at the desktop width, then at the phone width, the desktop
// skeleton must show again at the desktop width, without a new render.
test("skeletons switch with the window width", async ({ page, isMobile }) => {
  test.skip(isMobile, "resizes the window itself");
  const desktop = page.viewportSize() ?? { width: 1280, height: 720 };
  // /feed: the sidebar moves below the posts on narrow windows.
  await page.goto("/feed");
  await loadAllFonts(page);
  await page.addScriptTag({ content: measuringScript });

  await toggle(page, "Show content");
  const contents = await measureContents(page.locator("body"));
  await toggle(page, "Show skeletons");

  // Measure the phone layout too: now each Ghost has two variants.
  await page.setViewportSize({ width: 390, height: 844 });
  await toggle(page, "Show content");
  await toggle(page, "Show skeletons");
  expect(
    await page.locator(".ghostly-skeleton").count(),
    "both variants are in the page",
  ).toBeGreaterThan(await page.locator(".ghostly-skeleton:visible").count());

  await page.setViewportSize(desktop);
  await page.evaluate(() => window.scrollTo(0, 0));
  expectSkeletonsMatch(contents, await measureSkeletons(page.locator("body")));
});

// /async loads for real instead of using the toggle.
test("skeletons on /async show while loading and match the content", async ({
  page,
}) => {
  // `commit`: check before the page finished loading, while the data is
  // still on its way.
  await page.goto("/async", { waitUntil: "commit" });
  const skeletons = page.locator(SKELETON);
  await expect(
    page
      .locator(".ghostly-skeleton:visible, .ghostly-placeholder:visible")
      .first(),
  ).toBeVisible();
  await loadAllFonts(page);

  // Then the content of all Ghosts, and no skeleton is left.
  await expect(skeletons).toHaveCount(0, { timeout: 10_000 });
  await expect(
    page.getByText(/Loaded (on the server|in the browser)/),
  ).toBeVisible();

  // The posts that load in useEffect (a <Ghost count>): "Load again" shows
  // their skeletons, drawn from the measurement taken when they arrived.
  const posts = page.locator("section").filter({ hasText: "useEffect" });
  await page.addScriptTag({ content: measuringScript });
  const contents = await measureContents(posts);
  await posts.getByRole("button", { name: "Load again" }).click();
  await expect(posts.locator(".ghostly-skeleton:visible")).toHaveCount(
    contents[0]?.items.length ?? 0,
  );
  expectSkeletonsMatch(contents, await measureSkeletons(posts));
});

// Load every font first. The browser loads a font only once text uses it,
// and the skeletons show no text. So a font like the mono one would arrive
// after <Ghost> measured with a fallback font, and the content would no
// longer match the measurement.
// `allSettled`: some fonts can't load and that's fine, the browser uses the
// next one. E.g. the fallback of next/font is `local("Arial")`, which the
// Linux CI doesn't have.
async function loadAllFonts(page: Page) {
  await page.evaluate(async () => {
    await Promise.allSettled([...document.fonts].map((font) => font.load()));
  });
}

// Each skeleton must sit where its content was, box by box.
function expectSkeletonsMatch(contents: Content[], skeletons: Skeleton[]) {
  // Every page has Ghosts; none found means the selector broke, and the
  // checks below would pass without checking anything.
  expect(contents.length).toBeGreaterThan(0);
  // A list measured as items needs more than one, or the item checks below
  // would check nothing.
  for (const content of contents) {
    if (LISTS.has(content.name))
      expect(content.items.length).toBeGreaterThan(1);
  }

  for (const content of contents) {
    const label = `Ghost "${content.name}" ("${content.label}")`;
    const own = skeletons.filter((skeleton) => skeleton.name === content.name);
    const frames = own.flatMap((skeleton) =>
      skeleton.frame ? [skeleton.frame] : [],
    );
    // Shown before, so it was measured: no placeholder.
    expect.soft(frames.length, `${label}: skeletons`).toBe(own.length);
    const [first] = frames;
    if (!first) {
      expect.soft(first, `${label}: skeleton missing`).toBeDefined();
      continue;
    }

    // A normal <Ghost>: one skeleton for all of its content.
    if (!LISTS.has(content.name)) {
      expect.soft(frames.length, `${label}: number of skeletons`).toBe(1);
      expectFrameMatch(first, content.whole, label);
      continue;
    }

    // A list: the first skeleton is the first item, box by box. In the
    // playgrounds `count` matches the number of items.
    expectFrameMatch(first, content.firstItem, `${label} (first item)`);
    expect
      .soft(frames.length, `${label}: number of skeletons`)
      .toBe(content.items.length);
    // The others repeat it. Where the real items have the same size too
    // (cards in a grid), each skeleton must sit on its item.
    const sameSize = content.items.every(
      (item) =>
        Math.abs(item.width - content.firstItem.width) <= TOLERANCE &&
        Math.abs(item.height - content.firstItem.height) <= TOLERANCE,
    );
    for (const [index, frame] of frames.entries()) {
      expectClose(
        { ...frame, x: 0, y: 0 },
        { ...first, x: 0, y: 0 },
        `${label}: skeleton #${index} size`,
      );
      const item = content.items[index];
      if (sameSize && item) {
        expectClose(frame, item, `${label}: skeleton #${index} position`);
      }
    }
  }
}

function expectFrameMatch(skeleton: Frame, content: Frame, label: string) {
  expectClose(skeleton, content, `${label}: frame`);
  expect
    .soft(skeleton.boxes.length, `${label}: number of boxes`)
    .toBe(content.boxes.length);
  for (const [index, box] of content.boxes.entries()) {
    const drawn = skeleton.boxes[index];
    if (!drawn) continue;
    expectClose(drawn, box, `${label}: box #${index}`);
    expect
      .soft(drawn.rotate, `${label}: box #${index} rotate`)
      .toBe(box.rotate);
  }
}

async function toggle(page: Page, label: string) {
  await page.getByRole("button", { name: label }).click();
  // The other label shows once React rendered the switch.
  const other = label === "Show content" ? "Show skeletons" : "Show content";
  await expect(page.getByRole("button", { name: other })).toBeVisible();
  // Images (e.g. the cover in the feed) change the layout once loaded.
  await page.waitForLoadState("networkidle");
}

// For each top-level <Ghost> inside `scope` that shows its content: the
// content measured by `ghostlyjs/core`, in page coordinates (the page may
// scroll between the two measurings, e.g. to click a button).
function measureContents(scope: Locator): Promise<Content[]> {
  return scope.evaluate((root, skeleton) => {
    const wrappers = [...root.querySelectorAll("[data-ghost]")].filter(
      (element) =>
        !element.matches(skeleton) &&
        // Nested <Ghost>s belong to the skeleton of the outer one.
        !element.parentElement?.closest("[data-ghost]"),
    );
    const { measureElement, measureFrame } = window.ghostlyTest;
    const toPage = (rect: DOMRect) => ({
      x: rect.x + scrollX,
      y: rect.y + scrollY,
      width: rect.width,
      height: rect.height,
    });
    // A measurement with its boxes in page coordinates.
    const measure = (element: Element, nodes: Node[], list: boolean) => {
      const { width, height, boxes } = measureElement(element, { list });
      const { x, y } = toPage(measureFrame(nodes));
      return {
        x,
        y,
        width,
        height,
        boxes: boxes.map((box) => ({ ...box, x: x + box.x, y: y + box.y })),
      };
    };

    return wrappers.map((element) => {
      const items = [...element.children];
      return {
        name: element.getAttribute("data-ghost") ?? "",
        label: (element.textContent ?? "").trim().slice(0, 30),
        whole: measure(element, [...element.childNodes], false),
        firstItem: measure(element, items.slice(0, 1), true),
        items: items.map((item) => toPage(item.getBoundingClientRect())),
      };
    });
  }, SKELETON);
}

// The drawn skeletons inside `scope` and their boxes, in page coordinates.
// Only the shown ones: CSS hides the variants of other window widths.
function measureSkeletons(scope: Locator): Promise<Skeleton[]> {
  return scope.evaluate(
    (root, selector) =>
      [...root.querySelectorAll(selector)]
        .filter((element) => element.getClientRects().length > 0)
        .map((element) => {
          const name = element.getAttribute("data-ghost") ?? "";
          if (!element.matches(".ghostly-skeleton"))
            return { name, frame: null };
          const rect = element.getBoundingClientRect();
          const x = rect.x + scrollX;
          const y = rect.y + scrollY;
          const boxes = [
            ...element.querySelectorAll<HTMLElement>(".ghostly-box"),
          ];
          return {
            name,
            frame: {
              x,
              y,
              width: rect.width,
              height: rect.height,
              boxes: boxes.map((box) => {
                // The computed values ignore `transform`, so a rotated box
                // keeps its real size. Unlike `offsetLeft` & co. they aren't
                // rounded.
                const style = getComputedStyle(box);
                return {
                  x: x + parseFloat(style.left),
                  y: y + parseFloat(style.top),
                  width: parseFloat(style.width),
                  height: parseFloat(style.height),
                  rotate:
                    parseFloat(box.style.transform.replace("rotate(", "")) ||
                    undefined,
                };
              }),
            },
          };
        }),
    SKELETON,
  );
}

function expectClose(actual: Rect, expected: Rect, message: string) {
  for (const key of ["x", "y", "width", "height"] as const) {
    expect
      .soft(Math.abs(actual[key] - expected[key]), `${message} ${key}`)
      .toBeLessThanOrEqual(TOLERANCE);
  }
}
