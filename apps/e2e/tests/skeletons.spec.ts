// Compares each skeleton with the content it stands for: the skeleton must
// sit exactly where the content was, and every box must cover the same
// part. Runs against both playgrounds (see playwright.config.ts).
//
// The skeletons come from a fresh measurement, not from `ghostly.json`: in
// dev mode a <Ghost> measures its content when it is shown and keeps that
// measurement for its skeleton. So the test checks measuring and drawing,
// and an outdated `ghostly.json` doesn't make it fail.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { expect, test, type Page } from "@playwright/test";

// /async loads for real and has no toggle.
const paths = ["/", "/feed", "/dashboard", "/form", "/layouts", "/edge-cases"];

// Allowed difference in pixels. Measurements are rounded to one decimal,
// and the skeleton turns some of them into percentages.
const TOLERANCE = 1;

type Rect = { x: number; y: number; width: number; height: number };
type Box = Rect & { rotate?: number };
type Frame = Rect & { label: string; boxes: Box[] };

// The built measuring code of `ghostlyjs/core`, made available to the page
// as `window.ghostlyTest`. `measureFrame` is not exported, but the bundle
// keeps its name, so the test uses the library's own idea of the frame.
const measuringScript = `(() => {
${readFileSync(
  fileURLToPath(import.meta.resolve("ghostlyjs/core")),
  "utf8",
).replace(
  /^export \{.*\};?$/m,
  "window.ghostlyTest = { measureElement, measureFrame };",
)}
})();`;

declare global {
  interface Window {
    ghostlyTest: {
      measureElement: (root: Element) => {
        width: number;
        height: number;
        boxes: Box[];
      };
      measureFrame: (root: Element) => DOMRect;
    };
  }
}

// The wrapper <Ghost> renders around shown content, and its two skeletons.
const GHOST =
  'div[style="display: contents;"], .ghostly-skeleton, .ghostly-placeholder';

test.beforeEach(async ({ page }) => {
  // Never reach a running `ghostly dev`: it would store the measurements of
  // this test (e.g. in a phone window) in `ghostly.json`.
  await page.route("http://localhost:6767/**", (route) => route.abort());
});

for (const path of paths) {
  test(`skeletons match the content on ${path}`, async ({ page }) => {
    await page.goto(path);
    // Load every font first. The browser loads a font only once text uses
    // it, and the skeletons show no text. So a font like the mono one would
    // arrive after <Ghost> measured with a fallback font, and the content
    // would no longer match the measurement.
    await page.evaluate(async () => {
      await Promise.all([...document.fonts].map((font) => font.load()));
    });

    await toggle(page, "Show content");
    await page.addScriptTag({ content: measuringScript });
    const contents = await measureContents(page);

    await toggle(page, "Show skeletons");
    const skeletons = await measureSkeletons(page);

    // Every page has Ghosts; none found means the selector broke, and the
    // checks below would pass without checking anything.
    expect(contents.filter(Boolean).length).toBeGreaterThan(0);
    // One skeleton per <Ghost>, in the same order as the content.
    expect(skeletons).toHaveLength(contents.length);

    for (const [index, content] of contents.entries()) {
      // A <Ghost> that is always loading (never measured) has no content.
      if (!content) continue;
      const skeleton = skeletons[index];
      const label = `Ghost #${index} ("${content.label}")`;
      expect.soft(skeleton, `${label}: skeleton missing`).toBeDefined();
      if (!skeleton) continue;

      expectClose(skeleton, content, `${label}: frame`);
      expect
        .soft(skeleton.boxes.length, `${label}: number of boxes`)
        .toBe(content.boxes.length);
      for (const [boxIndex, box] of content.boxes.entries()) {
        const drawn = skeleton.boxes[boxIndex];
        if (!drawn) continue;
        expectClose(drawn, box, `${label}: box #${boxIndex}`);
        expect
          .soft(drawn.rotate, `${label}: box #${boxIndex} rotate`)
          .toBe(box.rotate);
      }
    }
  });
}

async function toggle(page: Page, label: string) {
  await page.getByRole("button", { name: label }).click();
  // The other label shows once React rendered the switch.
  const other = label === "Show content" ? "Show skeletons" : "Show content";
  await expect(page.getByRole("button", { name: other })).toBeVisible();
  // Images (e.g. the cover in the feed) change the layout once loaded.
  await page.waitForLoadState("networkidle");
}

// For each top-level <Ghost>: its content measured by `ghostlyjs/core`, at
// its position in the page. `null` for a <Ghost> that still shows a
// skeleton (one that is always loading).
function measureContents(page: Page): Promise<(Frame | null)[]> {
  return page.evaluate((selector) => {
    // Nested <Ghost>s belong to the skeleton of the outer one.
    const ghosts = [...document.querySelectorAll(selector)].filter(
      (element) => !element.parentElement?.closest(selector),
    );
    return ghosts.map((element) => {
      if (!element.matches('[style="display: contents;"]')) return null;
      const { measureElement, measureFrame } = window.ghostlyTest;
      const { width, height, boxes } = measureElement(element);
      const frame = measureFrame(element);
      return {
        label: (element.textContent ?? "").trim().slice(0, 30),
        x: frame.x,
        y: frame.y,
        width,
        height,
        // Boxes in page coordinates, like the drawn ones below.
        boxes: boxes.map((box) => ({
          ...box,
          x: frame.x + box.x,
          y: frame.y + box.y,
        })),
      };
    });
  }, GHOST);
}

// The drawn skeletons and their boxes, in page coordinates.
function measureSkeletons(page: Page): Promise<(Frame | null)[]> {
  return page.evaluate((selector) => {
    return [...document.querySelectorAll(selector)].map((element) => {
      if (!element.matches(".ghostly-skeleton")) return null;
      const frame = element.getBoundingClientRect();
      return {
        label: "",
        x: frame.x,
        y: frame.y,
        width: frame.width,
        height: frame.height,
        boxes: [...element.querySelectorAll<HTMLElement>(".ghostly-box")].map(
          (box) => {
            // The computed values ignore `transform`, so a rotated box keeps
            // its real size. Unlike `offsetLeft` & co. they aren't rounded.
            const style = getComputedStyle(box);
            return {
              x: frame.x + parseFloat(style.left),
              y: frame.y + parseFloat(style.top),
              width: parseFloat(style.width),
              height: parseFloat(style.height),
              rotate:
                parseFloat(box.style.transform.replace("rotate(", "")) ||
                undefined,
            };
          },
        ),
      };
    });
  }, GHOST);
}

function expectClose(actual: Rect, expected: Rect, message: string) {
  for (const key of ["x", "y", "width", "height"] as const) {
    expect
      .soft(Math.abs(actual[key] - expected[key]), `${message} ${key}`)
      .toBeLessThanOrEqual(TOLERANCE);
  }
}
