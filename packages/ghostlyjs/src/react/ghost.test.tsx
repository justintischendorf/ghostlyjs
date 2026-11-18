// Tests for <Ghost> and <GhostlyProvider> in dev mode (`NODE_ENV` is
// "development", see vitest.config.ts). Production: ghost.prod.test.tsx.

import { afterEach, describe, expect, test, vi } from "vitest";

import { DEFAULT_BREAKPOINTS } from "../core/breakpoints";
import { MEASURE_FLAG } from "../core/index";
import type { GhostlyData } from "../core/types";
import { Ghost, GhostlyProvider, isMeasuring } from "./index";
import {
  card,
  cleanup,
  everywhere,
  flush,
  measureAll,
  measuring,
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
    const { container } = await render(
      <Ghost name="a" isLoading={false}>
        {content}
      </Ghost>,
    );
    expect(container.textContent).toBe("Content");
    expect(container.querySelector(".ghostly-skeleton")).toBeNull();
  });

  test("sits in a `display: contents` wrapper, so layouts stay intact", async () => {
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

  test("a tall box (a card) stretches like a wide one", async () => {
    const tall = {
      width: 200,
      height: 400,
      fill: true,
      // Tall, and also a large square-ish card.
      boxes: [
        { x: 0, y: 0, width: 200, height: 400, radius: 12 },
        { x: 0, y: 0, width: 200, height: 250, radius: 12 },
      ],
    };
    const { container } = await render(
      <GhostlyProvider data={{ card: everywhere(tall) }}>
        <Ghost name="card" isLoading>
          {content}
        </Ghost>
      </GhostlyProvider>,
      300,
    );
    const boxes = [...container.querySelectorAll(".ghostly-box")];
    expect(boxes.map((box) => box.getBoundingClientRect().width)).toEqual([
      300, 300,
    ]);
  });

  test("with fill, grows with a wider parent", async () => {
    const { container } = await render(
      <GhostlyProvider data={{ card: everywhere({ ...card, fill: true }) }}>
        <Ghost name="card" isLoading>
          {content}
        </Ghost>
      </GhostlyProvider>,
      300,
    );
    const skeleton = container.querySelector(".ghostly-skeleton");
    expect(skeleton?.getBoundingClientRect().width).toBe(300);
  });

  test("without fill, keeps the measured width in a wider parent", async () => {
    const { container } = await render(
      <GhostlyProvider data={{ card: everywhere(card) }}>
        <Ghost name="card" isLoading>
          {content}
        </Ghost>
      </GhostlyProvider>,
      300,
    );
    const skeleton = container.querySelector(".ghostly-skeleton");
    expect(skeleton?.getBoundingClientRect().width).toBe(200);
  });

  // A parent sized by its content, like a toolbar with `w-auto`: it makes
  // room for the measured width instead of wrapping its other children.
  test("a parent sized by its content makes room for it", async () => {
    const { container } = await render(
      <GhostlyProvider data={{ card: everywhere(card) }}>
        <div id="toolbar" style={{ display: "inline-flex", gap: 8 }}>
          <span style={{ width: 50, height: 10 }} />
          <Ghost name="card" isLoading>
            {content}
          </Ghost>
        </div>
      </GhostlyProvider>,
    );
    const toolbar = container.querySelector("#toolbar");
    expect(toolbar?.getBoundingClientRect().width).toBe(258);
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

  // Measured by `ghostly measure` at every width: sizes as calc().
  test("a fluid measurement follows its parent like the content", async () => {
    const fluid = {
      width: 150,
      height: 40,
      fluid: true,
      // 100% of the parent minus a 50px sidebar.
      widthCalc: [-50, 100],
      boxes: [
        // A button pushed to the right edge: moves, keeps its width.
        {
          x: 50,
          y: 0,
          width: 100,
          height: 40,
          radius: 8,
          xCalc: [-100, 100],
        },
        // An icon on the left: keeps its place and size.
        { x: 0, y: 0, width: 40, height: 40, radius: 8 },
      ],
    };
    const { container } = await render(
      <GhostlyProvider data={{ bar: everywhere(fluid) }}>
        <Ghost name="bar" isLoading>
          {content}
        </Ghost>
      </GhostlyProvider>,
      400,
    );
    const skeleton = container.querySelector(".ghostly-skeleton")!;
    const frame = skeleton.getBoundingClientRect();
    expect(frame.width).toBe(350);
    const [button, icon] = [...skeleton.querySelectorAll(".ghostly-box")].map(
      (box) => box.getBoundingClientRect(),
    );
    expect(button).toMatchObject({ x: 250, width: 100 });
    expect(icon).toMatchObject({ x: 0, width: 40 });
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

describe("GhostlyProvider breakpoints", () => {
  // `ghostly measure` reads them to know the window widths to open.
  const attribute = (container: HTMLElement) =>
    JSON.parse(
      container
        .querySelector("style")
        ?.getAttribute("data-ghostly-breakpoints") ?? "null",
    );

  test("are on the style element for `ghostly measure`", async () => {
    const { container } = await render(
      <GhostlyProvider data={{}}>{null}</GhostlyProvider>,
    );
    expect(attribute(container)).toEqual(DEFAULT_BREAKPOINTS);
  });

  test("custom ones too", async () => {
    const { container } = await render(
      <GhostlyProvider data={{}} breakpoints={{ tablet: 600 }}>
        {null}
      </GhostlyProvider>,
    );
    expect(attribute(container)).toEqual({ tablet: 600 });
  });
});

describe("isMeasuring", () => {
  test("is true only in the browser of `ghostly measure`", () => {
    expect(isMeasuring()).toBe(false);
    vi.stubGlobal(MEASURE_FLAG, true);
    expect(isMeasuring()).toBe(true);
  });
});

describe("measuring in dev mode", () => {
  test("a fresh measurement replaces the stored one", async () => {
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

  test("a fresh measurement replaces only the variant of its width", async () => {
    const stored = (height: number) => ({ width: 10, height, boxes: [] });
    // Vitest's window is 414px wide: in "base@390".
    const data = { a: { base: stored(10), "base@390": stored(20) } };
    const ui = (isLoading: boolean) => (
      <GhostlyProvider data={data}>
        <Ghost name="a" isLoading={isLoading}>
          {content}
        </Ghost>
      </GhostlyProvider>
    );
    const { container, rerender } = await render(ui(false));
    await rerender(ui(true));

    const heights = [...container.querySelectorAll(".ghostly-skeleton")].map(
      (skeleton) => (skeleton as HTMLElement).style.height,
    );
    expect(heights).toEqual(["10px", "50px"]);
  });

  test("measures again when a web font arrived", async () => {
    const ui = (isLoading: boolean) => (
      <Ghost name="a" isLoading={isLoading}>
        <div id="text" style={{ width: 300, height: 50 }} />
      </Ghost>
    );
    const { container, rerender } = await render(ui(false));
    // The font changes the size of the text.
    container.querySelector<HTMLElement>("#text")!.style.width = "320px";
    document.fonts.dispatchEvent(new Event("loadingdone"));
    await flush();
    await rerender(ui(true));
    const skeleton = container.querySelector(".ghostly-skeleton");
    expect(skeleton?.getBoundingClientRect().width).toBe(320);
  });
});

describe("in the browser of `ghostly measure`", () => {
  test("shown <Ghost>s can be measured, with their parent's width", async () => {
    measuring();
    await render(
      <>
        <Ghost name="a" isLoading={false}>
          {content}
        </Ghost>
        <Ghost name="b" isLoading>
          {content}
        </Ghost>
      </>,
      400,
    );
    // "b" is loading: nothing to measure.
    expect(measureAll()).toEqual([
      {
        name: "a",
        measurement: expect.objectContaining({ width: 300, height: 50 }),
        parentWidth: 400,
      },
    ]);
  });

  test("only the given names", async () => {
    measuring();
    await render(
      <>
        {["a", "b", "c"].map((name) => (
          <Ghost key={name} name={name} isLoading={false}>
            {content}
          </Ghost>
        ))}
      </>,
    );
    expect(measureAll(["b"]).map((result) => result.name)).toEqual(["b"]);
  });

  test("a <Ghost> that loads again or is removed isn't measured", async () => {
    measuring();
    const ui = (isLoading: boolean) => (
      <Ghost name="a" isLoading={isLoading}>
        {content}
      </Ghost>
    );
    const { rerender, unmount } = await render(ui(false));
    expect(measureAll()).toHaveLength(1);
    await rerender(ui(true));
    expect(measureAll()).toHaveLength(0);
    await rerender(ui(false));
    expect(measureAll()).toHaveLength(1);
    unmount();
    expect(measureAll()).toHaveLength(0);
  });

  test("outside of it, nothing registers", async () => {
    await render(
      <Ghost name="a" isLoading={false}>
        {content}
      </Ghost>,
    );
    expect(measureAll()).toEqual([]);
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
    const { container } = await render(
      list(true, 5, { items: everywhere(item) }),
    );
    expect(container.querySelectorAll(".ghostly-skeleton")).toHaveLength(5);
  });

  test("`count` alone shows as many as were measured", async () => {
    const { container } = await render(
      list(true, true, { items: everywhere(item) }),
    );
    expect(container.querySelectorAll(".ghostly-skeleton")).toHaveLength(3);
  });

  test("the skeletons are items of the list, so its gap applies", async () => {
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
    const { container } = await render(list(true, 4));
    expect(container.querySelectorAll(".ghostly-placeholder")).toHaveLength(4);
  });

  test("an empty list when measured still shows one skeleton", async () => {
    const data = { items: everywhere({ ...item, count: 0 }) };
    const { container } = await render(list(true, true, data));
    expect(container.querySelectorAll(".ghostly-skeleton")).toHaveLength(1);
  });

  test("measures the first item and the count", async () => {
    measuring();
    const { container, rerender } = await render(list(false, true));
    expect(measureAll()).toEqual([
      expect.objectContaining({
        name: "items",
        measurement: expect.objectContaining({ height: 40, count: 3 }),
      }),
    ]);

    // The fresh measurement is used right away.
    await rerender(list(true, true));
    const skeletons = container.querySelectorAll(".ghostly-skeleton");
    expect(skeletons).toHaveLength(3);
    expect(skeletons[0]?.getBoundingClientRect().height).toBe(40);
  });
});

describe("data-ghost", () => {
  test("marks the content, the skeleton and the placeholder", async () => {
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
