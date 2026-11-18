// Compares each skeleton with the content it stands for: the skeleton must
// sit exactly where the content was, and every box must cover the same
// part. Runs against both playgrounds (see playwright.config.ts), on every
// page and in every state a tap reaches (tabs, dialogs, menus, sheets).
//
// Two kinds of skeletons are checked:
// - the stored ones, from the playground's `ghostly.json` as written by
//   `ghostly measure`. They show when a page loads, before any content was
//   shown. Checked at each project's width and, in the desktop project, at
//   widths inside the breakpoints, where they have to follow the window
//   (`calc()`, container units, the `@` widths of `ghostly.json`). So an
//   outdated `ghostly.json` fails here: measure the playgrounds again.
// - the fresh ones: in dev mode a <Ghost> measures its content when it is
//   shown and draws its skeleton from that measurement afterwards.

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test, type Locator, type Page } from "@playwright/test";

// A state of a page to check: its path, and what to tap there first, while
// the skeletons show. The taps are outside of any <Ghost>, like a tab bar,
// or in the URL (`?item=3`), so they work before the content is there.
type Scenario = {
  path: string;
  // What is tapped, e.g. "People tab".
  state?: string;
  open?: (page: Page) => Promise<void>;
  // Only where the trigger shows (the summary sheet below lg).
  maxWidth?: number;
  // Behind the pretend login of the playgrounds.
  signedIn?: boolean;
  // Other content than `ghostly measure` stored, like page 2 of a list:
  // only the fresh skeletons, measured from this content, must fit it.
  otherContent?: boolean;
};

const tab = (name: string) => (page: Page) =>
  page.getByRole("tab", { name }).click();
const button = (name: string) => (page: Page) =>
  page.getByRole("button", { name, exact: true }).click();

const scenarios: Scenario[] = [
  { path: "/" },
  { path: "/", state: "People tab", open: tab("People") },
  { path: "/", state: "notifications", open: button("Notifications") },
  { path: "/cards" },
  // The card `ghostly measure` opens: it taps the filters before, the
  // last one shows the done cards. The dialog shows other names for other
  // cards, and the skeleton those of card 5.
  {
    path: "/cards?item=5",
    state: "details dialog",
    // Opens once the page read the URL (in Next.js after a <Suspense>).
    open: (page) => page.locator("dialog[open]").waitFor(),
  },
  // The same <Ghost>s with other cards, and fewer of them.
  { path: "/cards?page=2", otherContent: true },
  { path: "/cards?page=3", otherContent: true },
  {
    path: "/cards",
    state: "accordion",
    open: (page) => page.getByText("A Ghost in a closed accordion").click(),
  },
  {
    path: "/cards",
    state: "summary sheet",
    open: (page) => page.getByRole("button", { name: /^Summary/ }).click(),
    maxWidth: 1023,
  },
  { path: "/collections" },
  {
    path: "/collections",
    state: "list view",
    open: (page) => page.getByRole("radio", { name: "Show as list" }).click(),
  },
  {
    path: "/collections",
    state: "form dialog",
    open: button("New collection"),
  },
  // The first detail page `ghostly measure` finds; the others show other
  // names and texts in the same <Ghost>s.
  { path: "/collections/1" },
  { path: "/collections/1", state: "people tab", open: tab("People") },
  { path: "/collections/1", state: "chat tab", open: tab("Chat") },
  { path: "/collections/1", state: "matrix tab", open: tab("Matrix") },
  { path: "/charts" },
  { path: "/account", signedIn: true },
  {
    path: "/account",
    state: "two-factor",
    open: button("Enable two-factor"),
    signedIn: true,
  },
  { path: "/signin" },
  { path: "/admin" },
  { path: "/edge-cases" },
];

// The widths the desktop window is resized to: the start of each
// breakpoint range (Tailwind's), where `ghostly measure` measured, and
// widths inside them, where the stored skeletons follow the window like
// the content does. The mobile project stays at the phone's width.
const WIDTHS = [
  320, 360, 520, 640, 700, 768, 900, 1024, 1150, 1280, 1400, 1536, 1700, 1920,
];

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
    playground?: { setLoading: (isLoading: boolean) => void };
  }
}

// The <Ghost count> lists of the playgrounds: their measurements have a
// `count`. Both playgrounds have the same <Ghost>s. Named, because a list
// can look like a normal <Ghost>: in a single column, one skeleton for the
// whole list would sit right too, but show the wrong number of items.
const LISTS = new Set(
  Object.entries(
    JSON.parse(
      readFileSync(
        fileURLToPath(
          new URL("../../playground-vite/ghostly.json", import.meta.url),
        ),
        "utf8",
      ),
    ) as Record<string, Record<string, { count?: number }>>,
  )
    .filter(([, entry]) =>
      Object.values(entry).some((measurement) => "count" in measurement),
    )
    .map(([name]) => name),
);

// What <Ghost> renders: a wrapper around shown content, or its skeletons.
// `data-ghost` holds the name.
const SKELETON = ".ghostly-skeleton, .ghostly-placeholder";

// Hydration errors React reports during a test. The server doesn't know the
// window width, so it must render the same skeletons as the browser.
let hydrationErrors: string[] = [];

test.beforeEach(async ({ page }) => {
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

const titleOf = (scenario: Scenario) =>
  scenario.path + (scenario.state ? ` (${scenario.state})` : "");

// Each scenario loads once. The stored skeletons switch with CSS, so they
// are measured at every width first, while nothing was shown yet; then the
// content at the same widths. The fresh skeletons right where the content
// first showed: <Ghost> measures once per breakpoint, and another width of
// the same breakpoint would measure a bit differently.
for (const scenario of scenarios) {
  test(`skeletons match the content on ${titleOf(scenario)}`, async ({
    page,
    baseURL,
    isMobile,
  }) => {
    test.setTimeout(120_000);
    const height = page.viewportSize()?.height ?? 720;
    const widths = (isMobile ? [page.viewportSize()!.width] : WIDTHS).filter(
      (width) => width <= (scenario.maxWidth ?? Infinity),
    );
    // Taps happen at the first width: there the trigger shows.
    if (!isMobile) await resize(page, widths[0]!, height);
    await openScenario(page, baseURL!, scenario);

    const stored: Skeleton[][] = [];
    for (const width of widths) {
      await resize(page, width, height);
      stored.push(await measureSkeletons(page.locator("body")));
    }

    await setLoading(page, false);
    const last = await measureContents(page.locator("body"));
    await setLoading(page, true);
    const fresh = await measureSkeletons(page.locator("body"));
    expectSkeletonsMatch(last, fresh, `fresh at ${widths.at(-1)}px`);

    if (scenario.otherContent) return;
    await setLoading(page, false);
    for (const [index, width] of widths.entries()) {
      await resize(page, width, height);
      const contents = await measureContents(page.locator("body"));
      expectSkeletonsMatch(contents, stored[index]!, `stored at ${width}px`);
    }
  });
}

// A new window width, laid out: two frames, for what an effect changed.
// Scrolled to the top, so sticky sidebars sit in the same place in both
// phases (a tap scrolls).
async function resize(page: Page, width: number, height: number) {
  if (page.viewportSize()?.width !== width) {
    await page.setViewportSize({ width, height });
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(
    () =>
      new Promise((done) =>
        requestAnimationFrame(() => requestAnimationFrame(done)),
      ),
  );
}

// The skeleton switches with CSS when the window gets narrower or wider:
// measured at the desktop width, then at the phone width, the desktop
// skeleton must show again at the desktop width, without a new render.
test("skeletons switch with the window width", async ({ page, isMobile }) => {
  test.skip(isMobile, "resizes the window itself");
  const desktop = page.viewportSize() ?? { width: 1280, height: 720 };
  // The dashboard: the sidebar moves below the main column on narrow
  // windows.
  await page.goto("/");
  await loadAllFonts(page);
  await page.addScriptTag({ content: measuringScript });

  await setLoading(page, false);
  const contents = await measureContents(page.locator("body"));
  await setLoading(page, true);

  // Measure the phone layout too: now each Ghost has fresh measurements
  // for both widths, and a variant for each.
  await page.setViewportSize({ width: 390, height: 844 });
  await setLoading(page, false);
  await setLoading(page, true);
  expect(
    await page.locator(".ghostly-skeleton").count(),
    "both variants are in the page",
  ).toBeGreaterThan(await page.locator(".ghostly-skeleton:visible").count());

  await page.setViewportSize(desktop);
  await page.evaluate(() => window.scrollTo(0, 0));
  expectSkeletonsMatch(
    contents,
    await measureSkeletons(page.locator("body")),
    "after resizing",
  );
});

// /async loads for real instead of using the toggle.
test("skeletons on /async show while loading and match the content", async ({
  page,
}) => {
  // `commit`: check before the page finished loading, while the data is
  // still on its way.
  await page.goto("/async", { waitUntil: "commit" });
  const skeletons = page.locator("main").locator(SKELETON);
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

  // The activity that loads in useEffect (a <Ghost count>): "Load again"
  // shows its skeletons, drawn from the measurement taken when it arrived.
  const posts = page.locator("section").filter({ hasText: "useEffect" });
  await page.addScriptTag({ content: measuringScript });
  const contents = await measureContents(posts);
  await posts.getByRole("button", { name: "Load again" }).click();
  await expect(posts.locator(".ghostly-skeleton:visible")).toHaveCount(
    contents[0]?.items.length ?? 0,
  );
  expectSkeletonsMatch(contents, await measureSkeletons(posts), "fresh");
});

// `ghostly measure` never taps what is marked with `data-ghostly-skip`, and
// the playground's skipped <Ghost> really only shows after a tap there.
test("the skipped subscription part hides a <Ghost>", async ({
  page,
  baseURL,
}) => {
  test.skip(
    !test.info().project.name.endsWith("desktop"),
    "once per playground",
  );
  await openScenario(page, baseURL!, { path: "/account", signedIn: true });
  await setLoading(page, false);
  await page.getByRole("button", { name: "Cancel subscription" }).click();
  await expect(page.locator('[data-ghost="account-cancelled"]')).toHaveCount(1);
});

// Without the pretend login, the account page sends you to /signin.
test("the account page needs the session cookie", async ({ page }) => {
  await page.goto("/account");
  await expect(page).toHaveURL(/\/signin$/);
});

// Opens the page of the scenario with its skeletons (nothing was shown
// yet, so they come from `ghostly.json`) and taps what it needs.
async function openScenario(page: Page, baseURL: string, scenario: Scenario) {
  if (scenario.signedIn) {
    await page
      .context()
      .addCookies([{ name: "session", value: "playground", url: baseURL }]);
  }
  await page.goto(scenario.path);
  await page.waitForLoadState("networkidle");
  await loadAllFonts(page);
  await scenario.open?.(page);
  await imagesLoaded(page);
  await page.addScriptTag({ content: measuringScript });
}

// Switches every <Ghost> between content and skeletons. Through the
// playground's hook, because an open dialog covers the toggle in the nav.
async function setLoading(page: Page, isLoading: boolean) {
  await page.waitForFunction(() => !!window.playground);
  await page.evaluate(
    (value) => window.playground!.setLoading(value),
    isLoading,
  );
  // The toggle's other label shows once React rendered the switch.
  await expect(
    page.locator(
      `button[aria-label="${isLoading ? "Show content" : "Show skeletons"}"]`,
    ),
  ).toHaveCount(1);
  await imagesLoaded(page);
  await loadAllFonts(page);
  // Two frames: layout, then what an effect changed after it.
  await page.evaluate(
    () =>
      new Promise((done) =>
        requestAnimationFrame(() => requestAnimationFrame(done)),
      ),
  );
}

// Images (e.g. the covers) change the layout once loaded. Not
// `networkidle`: an <iframe srcdoc> added later keeps it from coming back.
async function imagesLoaded(page: Page) {
  await page.waitForFunction(() =>
    [...document.images].every((image) => image.complete),
  );
}

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

// Each skeleton must sit where its content was, box by box. `kind` names
// the skeletons in the messages ("stored", "fresh").
// Content that takes no space (hidden at this width, like the summary's
// sidebar on phones, or nothing at all) isn't drawn, and neither is its
// skeleton: both are left out. A skeleton of no size for content that has
// one is still missing then.
function expectSkeletonsMatch(
  allContents: Content[],
  allSkeletons: Skeleton[],
  kind: string,
) {
  const hasSize = (rect: Rect) => rect.width > 0 && rect.height > 0;
  const contents = allContents.filter((content) => hasSize(content.whole));
  const skeletons = allSkeletons.filter(
    (skeleton) => !skeleton.frame || hasSize(skeleton.frame),
  );
  // Every page has Ghosts; none found means the selector broke, and the
  // checks below would pass without checking anything.
  // (Hidden ones count: /signin's only one is hidden below lg.)
  expect(allContents.length).toBeGreaterThan(0);
  // A list measured as items needs more than one, or the item checks below
  // would check nothing.
  for (const content of contents) {
    if (LISTS.has(content.name))
      expect(content.items.length, content.name).toBeGreaterThan(1);
  }

  // Two <Ghost>s with the same name: the skeletons in the same order.
  const used = new Map<string, number>();
  for (const content of contents) {
    const label = `${kind} skeleton of "${content.name}" ("${content.label}")`;
    const own = skeletons.filter((skeleton) => skeleton.name === content.name);
    const frames = own.flatMap((skeleton) =>
      skeleton.frame ? [skeleton.frame] : [],
    );
    // Measured, so no placeholder.
    expect.soft(frames.length, `${label}: skeletons`).toBe(own.length);

    // A normal <Ghost>: one skeleton for all of its content.
    if (!LISTS.has(content.name)) {
      const index = used.get(content.name) ?? 0;
      used.set(content.name, index + 1);
      const twins = contents.filter((item) => item.name === content.name);
      expect
        .soft(frames.length, `${label}: number of skeletons`)
        .toBe(twins.length);
      const frame = frames[index];
      if (!frame) {
        expect.soft(frame, `${label}: skeleton missing`).toBeDefined();
        continue;
      }
      expectFrameMatch(frame, content.whole, label);
      continue;
    }

    const [first] = frames;
    if (!first) {
      expect.soft(first, `${label}: skeleton missing`).toBeDefined();
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
    // Hidden content (in a closed <details>, `hidden lg:block`) counts as
    // taking no space. Plain text has no element to check.
    const isVisible = (element: Element) =>
      element.children.length === 0 ||
      [...element.children].some((child) => child.checkVisibility());
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
      const whole = measure(element, [...element.childNodes], false);
      return {
        name: element.getAttribute("data-ghost") ?? "",
        label: (element.textContent ?? "").trim().slice(0, 30),
        whole: isVisible(element) ? whole : { ...whole, width: 0, height: 0 },
        firstItem: measure(element, items.slice(0, 1), true),
        items: items.map((item) => toPage(item.getBoundingClientRect())),
      };
    });
  }, SKELETON);
}

// The drawn skeletons inside `scope` and their boxes, in page coordinates.
// Only the shown ones: CSS hides the variants of other window widths, and
// a closed <details> what is inside.
function measureSkeletons(scope: Locator): Promise<Skeleton[]> {
  return scope.evaluate(
    (root, selector) =>
      [...root.querySelectorAll(selector)]
        .filter((element) => element.checkVisibility())
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
