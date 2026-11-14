// Tests for <Ghost> and <GhostlyProvider> in dev mode (`NODE_ENV` is
// "development", see vitest.config.ts). Production: ghost.prod.test.tsx.
//
// <Ghost> remembers per page load whether `ghostly dev` answered. Each test
// file runs in its own page, but the tests in one file share it. So every
// test here has the collector online; the offline case has its own file
// (collector-offline.test.tsx).

import { afterEach, describe, expect, test, vi } from "vitest";

import type { GhostlyData } from "../core/types";
import { Ghost, GhostlyProvider } from "./index";
import {
  card,
  cleanup,
  everywhere,
  flush,
  mockCollector,
  render,
} from "./test-utils";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

// A 300x50 block with a background: measured as one box.
const content = (
  <div style={{ width: 300, height: 50, background: "red" }}>Content</div>
);

describe("content", () => {
  test("is shown when not loading", async () => {
    mockCollector(true);
    const { container } = await render(
      <Ghost name="a" isLoading={false}>
        {content}
      </Ghost>,
    );
    expect(container.textContent).toBe("Content");
    expect(container.querySelector(".ghostly-skeleton")).toBeNull();
  });

  test("sits in a `display: contents` wrapper, so layouts stay intact", async () => {
    mockCollector(true);
    const { container } = await render(
      <Ghost name="a" isLoading={false}>
        {content}
      </Ghost>,
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.style.display).toBe("contents");
  });
});

describe("skeleton", () => {
  test("is one placeholder bar when never measured", async () => {
    mockCollector(true);
    const { container } = await render(
      <GhostlyProvider data={{}}>
        <Ghost name="a" isLoading>
          {content}
        </Ghost>
      </GhostlyProvider>,
    );
    expect(container.querySelector(".ghostly-placeholder")).not.toBeNull();
    expect(container.textContent).not.toContain("Content");
  });

  test("works without a provider", async () => {
    const { container } = await render(
      <Ghost name="a" isLoading>
        {content}
      </Ghost>,
    );
    expect(container.querySelector(".ghostly-placeholder")).not.toBeNull();
  });

  test("draws the measurement from the provider", async () => {
    const { container } = await render(
      <GhostlyProvider data={{ card: everywhere(card) }}>
        <Ghost name="card" isLoading>
          {content}
        </Ghost>
      </GhostlyProvider>,
    );
    const skeleton = container.querySelector<HTMLElement>(".ghostly-skeleton");
    expect(skeleton?.getBoundingClientRect()).toMatchObject({
      width: 200,
      height: 100,
    });
    expect(skeleton?.querySelectorAll(".ghostly-box")).toHaveLength(4);
  });

  test("uses the measurement stored under its own name", async () => {
    const data: GhostlyData = {
      other: everywhere({ width: 50, height: 10, boxes: [] }),
      card: everywhere(card),
    };
    const { container } = await render(
      <GhostlyProvider data={data}>
        <Ghost name="card" isLoading>
          {content}
        </Ghost>
      </GhostlyProvider>,
    );
    const skeleton = container.querySelector(".ghostly-skeleton");
    expect(skeleton?.getBoundingClientRect().height).toBe(100);
  });

  test("places each box like the measurement", async () => {
    const { container } = await render(
      <GhostlyProvider data={{ card: everywhere(card) }}>
        <Ghost name="card" isLoading>
          {content}
        </Ghost>
      </GhostlyProvider>,
    );
    const [surface, avatar, line, badge] = [
      ...container.querySelectorAll<HTMLElement>(".ghostly-box"),
    ].map((box) => box.style);

    // Wide boxes in percent of the frame, so they follow its width.
    expect(surface).toMatchObject({ left: "0%", top: "0px", width: "100%" });
    expect(surface?.borderRadius).toBe("16px");
    // Square-ish boxes keep their size, so circles stay round, but never
    // reach past the right edge.
    expect(avatar).toMatchObject({ width: "40px", maxWidth: "95%" });
    expect(line?.transform).toBe("rotate(15deg)");
    // A box that already stuck out when measured stays as it is.
    expect(badge?.maxWidth).toBe("");
  });

  test("shrinks with a narrower parent instead of overlapping", async () => {
    const { container } = await render(
      <GhostlyProvider data={{ card: everywhere(card) }}>
        <Ghost name="card" isLoading>
          {content}
        </Ghost>
      </GhostlyProvider>,
      100,
    );
    const skeleton = container.querySelector(".ghostly-skeleton");
    const boxes = container.querySelectorAll(".ghostly-box");
    expect(skeleton?.getBoundingClientRect().width).toBe(100);
    // The wide surface follows, the avatar keeps its 40px.
    expect(boxes[0]?.getBoundingClientRect().width).toBe(100);
    expect(boxes[1]?.getBoundingClientRect().width).toBe(40);
  });

  test.each([
    ["center", "auto", "auto"],
    ["right", "auto", ""],
    [undefined, "", ""],
  ])("align %s → margins %s / %s", async (align, left, right) => {
    const { container } = await render(
      <GhostlyProvider data={{ card: everywhere({ ...card, align }) }}>
        <Ghost name="card" isLoading>
          {content}
        </Ghost>
      </GhostlyProvider>,
    );
    const skeleton = container.querySelector<HTMLElement>(".ghostly-skeleton");
    expect(skeleton?.style.marginLeft).toBe(left);
    expect(skeleton?.style.marginRight).toBe(right);
  });

  test("keeps the measured flex-shrink", async () => {
    const { container } = await render(
      <GhostlyProvider data={{ card: everywhere({ ...card, flexShrink: 0 }) }}>
        <Ghost name="card" isLoading>
          {content}
        </Ghost>
      </GhostlyProvider>,
    );
    const skeleton = container.querySelector<HTMLElement>(".ghostly-skeleton");
    expect(skeleton?.style.flex).toBe("0 0 auto");
  });
});

describe("GhostlyProvider", () => {
  test("adds the skeleton styles to the page", async () => {
    const { container } = await render(
      <GhostlyProvider data={{}}>
        <Ghost name="a" isLoading>
          {null}
        </Ghost>
      </GhostlyProvider>,
    );
    const styles = container.querySelectorAll("style");
    expect(styles).toHaveLength(1);
    expect(styles[0]?.textContent).toContain(".ghostly-skeleton");
    // The styles are in effect: boxes are positioned in the frame.
    const placeholder = container.querySelector(".ghostly-placeholder");
    expect(getComputedStyle(placeholder!).borderRadius).toBe("4px");
  });
});

describe("measuring in dev mode", () => {
  test("a fresh measurement replaces the stored one", async () => {
    mockCollector(true);
    const stored = { width: 10, height: 10, boxes: [] };
    const ui = (isLoading: boolean) => (
      <GhostlyProvider data={{ a: everywhere(stored) }}>
        <Ghost name="a" isLoading={isLoading}>
          {content}
        </Ghost>
      </GhostlyProvider>
    );
    const { container, rerender } = await render(ui(false));
    await rerender(ui(true));

    const skeleton = container.querySelector(".ghostly-skeleton");
    expect(skeleton?.getBoundingClientRect()).toMatchObject({
      width: 300,
      height: 50,
    });
  });

  test("sends the measurement to `ghostly dev`", async () => {
    const fetch = mockCollector(true);
    await render(
      <Ghost name="a" isLoading={false}>
        {content}
      </Ghost>,
    );
    await flush();

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://localhost:6767");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({
      name: "a",
      // Vitest's window is 414px wide: below Tailwind's `sm`.
      breakpoint: "base",
      measurement: expect.objectContaining({ width: 300, height: 50 }),
    });
  });

  test("measures again when the content is shown again", async () => {
    const fetch = mockCollector(true);
    const ui = (isLoading: boolean) => (
      <Ghost name="a" isLoading={isLoading}>
        {content}
      </Ghost>
    );
    const { rerender } = await render(ui(false));
    await rerender(ui(true));
    await rerender(ui(false));
    await flush();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  test("doesn't measure while loading", async () => {
    const fetch = mockCollector(true);
    await render(
      <Ghost name="a" isLoading>
        {content}
      </Ghost>,
    );
    await flush();
    expect(fetch).not.toHaveBeenCalled();
  });

  test("with the collector online, every Ghost sends", async () => {
    const fetch = mockCollector(true);
    await render(
      <>
        {["a", "b", "c"].map((name) => (
          <Ghost key={name} name={name} isLoading={false}>
            {content}
          </Ghost>
        ))}
      </>,
    );
    await flush();
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});

describe("lists (count)", () => {
  // Three cards; the <Ghost> sits inside the list's container.
  const items = ["One", "Two", "Three"].map((text) => (
    <div key={text} style={{ height: 40, background: "red" }}>
      {text}
    </div>
  ));
  const list = (isLoading: boolean, count: number | true, data = {}) => (
    <GhostlyProvider data={data}>
      <div
        className="list"
        style={{ display: "flex", flexDirection: "column", gap: 10 }}
      >
        <Ghost name="items" isLoading={isLoading} count={count}>
          {items}
        </Ghost>
      </div>
    </GhostlyProvider>
  );
  const item = { width: 400, height: 40, boxes: [], count: 3 };

  test("shows the measured item `count` times", async () => {
    mockCollector(true);
    const { container } = await render(
      list(true, 5, { items: everywhere(item) }),
    );
    expect(container.querySelectorAll(".ghostly-skeleton")).toHaveLength(5);
  });

  test("`count` alone shows as many as were measured", async () => {
    mockCollector(true);
    const { container } = await render(
      list(true, true, { items: everywhere(item) }),
    );
    expect(container.querySelectorAll(".ghostly-skeleton")).toHaveLength(3);
  });

  test("the skeletons are items of the list, so its gap applies", async () => {
    mockCollector(true);
    const { container } = await render(
      list(true, 3, { items: everywhere(item) }),
    );
    const skeletons = [
      ...container.querySelectorAll<HTMLElement>(".ghostly-skeleton"),
    ];
    expect(skeletons.every((s) => s.parentElement?.className === "list")).toBe(
      true,
    );
    const [first, second] = skeletons.map((s) => s.getBoundingClientRect());
    expect(second!.top - first!.bottom).toBe(10);
  });

  test("without a measurement, one placeholder per item", async () => {
    mockCollector(true);
    const { container } = await render(list(true, 4));
    expect(container.querySelectorAll(".ghostly-placeholder")).toHaveLength(4);
  });

  test("an empty list when measured still shows one skeleton", async () => {
    mockCollector(true);
    const data = { items: everywhere({ ...item, count: 0 }) };
    const { container } = await render(list(true, true, data));
    expect(container.querySelectorAll(".ghostly-skeleton")).toHaveLength(1);
  });

  test("measures the first item and sends the count", async () => {
    const fetch = mockCollector(true);
    const { container, rerender } = await render(list(false, true));
    await flush();

    const sent = JSON.parse(
      (fetch.mock.calls.at(-1) as unknown as [string, RequestInit])[1]
        .body as string,
    );
    expect(sent.name).toBe("items");
    expect(sent.measurement).toMatchObject({ height: 40, count: 3 });

    // The fresh measurement is used right away.
    await rerender(list(true, true));
    const skeletons = container.querySelectorAll(".ghostly-skeleton");
    expect(skeletons).toHaveLength(3);
    expect(skeletons[0]?.getBoundingClientRect().height).toBe(40);
  });
});

describe("data-ghost", () => {
  test("marks the content, the skeleton and the placeholder", async () => {
    mockCollector(true);
    const ui = (isLoading: boolean, data: GhostlyData) => (
      <GhostlyProvider data={data}>
        <Ghost name="a" isLoading={isLoading}>
          {content}
        </Ghost>
      </GhostlyProvider>
    );
    const { container, rerender } = await render(ui(true, {}));
    expect(
      container
        .querySelector(".ghostly-placeholder")
        ?.getAttribute("data-ghost"),
    ).toBe("a");
    await rerender(ui(true, { a: everywhere(card) }));
    expect(
      container.querySelector(".ghostly-skeleton")?.getAttribute("data-ghost"),
    ).toBe("a");
    await rerender(ui(false, { a: everywhere(card) }));
    expect(container.querySelector('[data-ghost="a"]')?.textContent).toBe(
      "Content",
    );
  });
});
