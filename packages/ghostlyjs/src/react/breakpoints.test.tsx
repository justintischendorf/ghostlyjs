// Responsive skeletons in a real browser: CSS picks the variant for the
// window width, measurements are stored per breakpoint, and the server
// renders the same HTML as the browser (no hydration errors).

import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";

import type { GhostBoxMeasurement, GhostlyData } from "../core/types";
import { Ghost, GhostlyProvider } from "./index";
import { cleanup, flush, mockCollector, render } from "./test-utils";

afterEach(async () => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  // Vitest's default size.
  await page.viewport(414, 896);
});

// Measurements told apart by their height.
const high = (height: number): GhostBoxMeasurement => ({
  width: 200,
  height,
  boxes: [{ x: 0, y: 0, width: 200, height, radius: 0 }],
});

// The heights of the skeletons that are shown (not hidden by CSS).
function visibleHeights(container: HTMLElement): number[] {
  return [...container.querySelectorAll(".ghostly-skeleton")]
    .filter((skeleton) => skeleton.getClientRects().length > 0)
    .map((skeleton) => skeleton.getBoundingClientRect().height);
}

const ghost = (data: GhostlyData, breakpoints?: Record<string, number>) => (
  <GhostlyProvider data={data} breakpoints={breakpoints}>
    <Ghost name="a" isLoading>
      <div>Content</div>
    </Ghost>
  </GhostlyProvider>
);

describe("variants", () => {
  test("CSS shows the variant of the current window width", async () => {
    const { container } = await render(
      ghost({ a: { base: high(40), lg: high(80) } }),
    );
    // Both are in the page; one is hidden.
    expect(container.querySelectorAll(".ghostly-skeleton")).toHaveLength(2);
    expect(visibleHeights(container)).toEqual([40]);

    await page.viewport(1100, 800);
    expect(visibleHeights(container)).toEqual([80]);

    // Exactly at the breakpoint, the larger one.
    await page.viewport(1024, 800);
    expect(visibleHeights(container)).toEqual([80]);
    await page.viewport(1023, 800);
    expect(visibleHeights(container)).toEqual([40]);
  });

  test("one variant has no hide classes", async () => {
    const { container } = await render(ghost({ a: { md: high(40) } }));
    const skeleton = container.querySelector(".ghostly-skeleton");
    expect(skeleton?.className).toBe("ghostly-skeleton");
  });

  test("custom breakpoints", async () => {
    const { container } = await render(
      ghost({ a: { base: high(40), tablet: high(80) } }, { tablet: 600 }),
    );
    await page.viewport(599, 800);
    expect(visibleHeights(container)).toEqual([40]);
    await page.viewport(600, 800);
    expect(visibleHeights(container)).toEqual([80]);
  });

  test("a list repeats each variant, one of them is shown", async () => {
    const { container } = await render(
      <GhostlyProvider data={{ a: { base: high(40), lg: high(80) } }}>
        <Ghost name="a" isLoading count={3}>
          {null}
        </Ghost>
      </GhostlyProvider>,
    );
    expect(container.querySelectorAll(".ghostly-skeleton")).toHaveLength(6);
    expect(visibleHeights(container)).toEqual([40, 40, 40]);
  });
});

describe("measuring per breakpoint", () => {
  test("is stored under the breakpoint of the window width", async () => {
    const fetch = mockCollector(true);
    await page.viewport(1300, 800);
    const ui = (isLoading: boolean) => (
      <GhostlyProvider data={{ a: { base: high(10) } }}>
        <Ghost name="a" isLoading={isLoading}>
          <div style={{ width: 200, height: 50 }} />
        </Ghost>
      </GhostlyProvider>
    );
    const { container, rerender } = await render(ui(false));
    await flush();

    const [, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toMatchObject({
      name: "a",
      breakpoint: "xl",
      measurement: { height: 50 },
    });

    // The fresh measurement shows at this width; the stored one for base
    // stays for narrow windows.
    await rerender(ui(true));
    expect(visibleHeights(container)).toEqual([50]);
    await page.viewport(414, 800);
    expect(visibleHeights(container)).toEqual([10]);
  });
});

describe("dev mode mark", () => {
  // `ghostly measure` reads it to tell dev mode from a production build.
  test("the provider marks dev mode", async () => {
    const { container } = await render(
      <GhostlyProvider data={{}}>{null}</GhostlyProvider>,
    );
    const style = container.querySelector("style[data-ghostly-breakpoints]");
    expect(style?.hasAttribute("data-ghostly-dev")).toBe(true);
  });
});

describe("server rendering", () => {
  test("the server renders the same HTML as the browser", async () => {
    const ui = (
      <GhostlyProvider data={{ a: { base: high(40), lg: high(80) } }}>
        <Ghost name="a" isLoading count={2}>
          {null}
        </Ghost>
      </GhostlyProvider>
    );
    // The server doesn't know the window width.
    const html = renderToString(ui);
    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.append(container);

    const errors: unknown[] = [];
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation((...args) => errors.push(args));
    await act(async () => {
      hydrateRoot(container, ui, {
        onRecoverableError: (error) => errors.push(error),
      });
    });

    expect(errors).toEqual([]);
    expect(consoleError).not.toHaveBeenCalled();
    expect(container.innerHTML).toBe(html);
    // And the browser still shows the right variant.
    expect(visibleHeights(container)).toEqual([40, 40]);
  });
});
