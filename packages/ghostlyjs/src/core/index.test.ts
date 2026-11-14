// Unit tests for the measuring code. They run in a real Chromium (see
// vitest.config.ts), because the measuring reads the real layout.

import { afterEach, describe, expect, test } from "vitest";

import { measureElement } from "./index";

// A 400px wide area at the top left of the page.
const containerStyle =
  "position: absolute; left: 0; top: 0; width: 400px; font: 16px/20px sans-serif";
const container = document.createElement("div");
document.body.append(container);

// A fresh container for each test, also when a test changed its style.
afterEach(() => {
  container.replaceChildren();
  container.style.cssText = containerStyle;
});
container.style.cssText = containerStyle;

// Renders `html` inside a wrapper with `display: contents`, like <Ghost>
// does, and measures it.
function measure(html: string) {
  const root = document.createElement("div");
  root.style.display = "contents";
  root.innerHTML = html;
  container.append(root);
  return measureElement(root);
}

describe("frame", () => {
  test("is measured from the children of the root", () => {
    const result = measure('<div style="width: 200px; height: 100px"></div>');
    expect(result).toMatchObject({ width: 200, height: 100, boxes: [] });
  });

  test("covers all children", () => {
    const result = measure(`
      <div style="width: 100px; height: 30px"></div>
      <div style="width: 250px; height: 20px"></div>`);
    expect(result).toMatchObject({ width: 250, height: 50 });
  });

  test("is empty without visible children", () => {
    expect(measure("")).toMatchObject({ width: 0, height: 0, boxes: [] });
  });

  test("of plain text takes the full line height", () => {
    container.style.lineHeight = "30px";
    const result = measure("Text");
    expect(result.height).toBe(30);
  });

  test("rounds to one decimal", () => {
    const result = measure(
      '<div style="width: 100.33px; height: 10.27px"></div>',
    );
    expect(result).toMatchObject({ width: 100.3, height: 10.3 });
  });
});

describe("surfaces", () => {
  test("an element with a background becomes a box", () => {
    const result = measure(`
      <div style="width: 200px; height: 100px; background: red;
        border-radius: 12px"></div>`);
    expect(result.boxes).toEqual([
      { x: 0, y: 0, width: 200, height: 100, radius: 12 },
    ]);
  });

  test("a large radius is capped, so `rounded-full` becomes a circle", () => {
    const result = measure(`
      <div style="width: 40px; height: 40px; background: red;
        border-radius: 9999px"></div>`);
    expect(result.boxes[0]?.radius).toBe(20);
  });

  test("boxes are relative to the frame", () => {
    const result = measure(`
      <div style="padding: 10px 20px">
        <div style="width: 50px; height: 50px; background: red"></div>
      </div>`);
    expect(result.boxes[0]).toMatchObject({ x: 20, y: 10 });
  });

  test.each([
    ["a background color", "background: red", true],
    ["rgb with a blue of 0", "background: rgb(255, 0, 0)", true],
    ["a background image", "background: linear-gradient(red, blue)", true],
    ["a shadow", "box-shadow: 0 1px 2px black", true],
    ["a border on all sides", "border: 1px solid black", true],
    ["no styles", "", false],
    ["a transparent background", "background: transparent", false],
    ["rgba with alpha 0", "background: rgba(255, 0, 0, 0)", false],
    ["oklch with alpha 0", "background: oklch(50% 0.1 200 / 0)", false],
    ["a divider on one side", "border-bottom: 1px solid black", false],
  ])("%s → box: %s", (_, style, isBox) => {
    const result = measure(
      `<div style="width: 100px; height: 50px; ${style}"></div>`,
    );
    expect(result.boxes).toHaveLength(isBox ? 1 : 0);
  });
});

describe("hidden elements", () => {
  test.each([["display: none"], ["visibility: hidden"], ["opacity: 0"]])(
    "%s is skipped",
    (style) => {
      const result = measure(`
      <div style="width: 50px; height: 50px; background: red"></div>
      <div style="width: 50px; height: 50px; background: red; ${style}"></div>`);
      expect(result.boxes).toHaveLength(1);
    },
  );
});

describe("media and form controls", () => {
  test("an icon is one box with a small radius, its paths are ignored", () => {
    const result = measure(`
      <svg width="24" height="24" style="display: block">
        <rect width="10" height="10" fill="red" />
        <circle cx="18" cy="18" r="4" fill="red" />
      </svg>`);
    expect(result.boxes).toEqual([
      { x: 0, y: 0, width: 24, height: 24, radius: 4 },
    ]);
  });

  test("an image is one box", () => {
    const result = measure(
      '<img alt="" style="display: block; width: 80px; height: 40px" />',
    );
    expect(result.boxes).toEqual([
      { x: 0, y: 0, width: 80, height: 40, radius: 0 },
    ]);
  });

  test("a textarea is one box, its text is ignored", () => {
    const result = measure(`
      <textarea style="display: block; box-sizing: border-box;
        width: 200px; height: 60px">
        Some text inside
      </textarea>`);
    expect(result.boxes).toHaveLength(1);
    expect(result.boxes[0]).toMatchObject({ width: 200, height: 60 });
  });
});

describe("text", () => {
  test("each line becomes a box with a small radius", () => {
    const result = measure(`
      <p style="margin: 0; width: 120px">
        A paragraph with enough words to wrap over several lines.
      </p>`);
    const lineCount = result.height / 20;
    expect(lineCount).toBeGreaterThan(1);
    expect(result.boxes).toHaveLength(lineCount);
    for (const [index, box] of result.boxes.entries()) {
      expect(box.radius).toBe(4);
      expect(box.width).toBeLessThanOrEqual(120);
      // One line below the other.
      expect(Math.floor(box.y / 20)).toBe(index);
    }
  });

  test("pieces on the same line are joined into one bar", () => {
    const result = measure(
      '<p style="margin: 0">Hi <b>there</b>, <i>you</i> 42<span>%</span></p>',
    );
    expect(result.boxes).toHaveLength(1);
  });

  test("text inside a surface gives the surface and the line", () => {
    const result = measure(`
      <button style="padding: 8px 16px; background: black; border: 0">
        Save
      </button>`);
    expect(result.boxes).toHaveLength(2);
    // The line sits inside the button.
    expect(result.boxes[1]?.x).toBeGreaterThanOrEqual(16);
  });

  test("a filled circle keeps no text bar", () => {
    const result = measure(`
      <div style="display: flex; align-items: center; justify-content: center;
        width: 48px; height: 48px; border-radius: 50%; background: red">
        AL
      </div>`);
    expect(result.boxes).toEqual([
      { x: 0, y: 0, width: 48, height: 48, radius: 24 },
    ]);
  });
});

describe("overflow", () => {
  test("boxes are clipped to a scroll area", () => {
    const result = measure(`
      <div style="width: 100px; overflow-x: auto">
        <div style="width: 300px; height: 50px; background: red"></div>
      </div>`);
    expect(result.boxes[0]).toMatchObject({ x: 0, width: 100 });
  });

  test("lines hidden by a clamped height are skipped", () => {
    const result = measure(`
      <p style="margin: 0; width: 100px; height: 20px; overflow: hidden">
        A paragraph with enough words to wrap over several lines.
      </p>`);
    expect(result.boxes).toHaveLength(1);
  });

  test("without clipping, a badge may stick out of the frame", () => {
    const result = measure(`
      <div style="position: relative; width: 64px; height: 64px">
        <span style="position: absolute; top: -4px; right: -4px;
          width: 24px; height: 24px; background: red"></span>
      </div>`);
    expect(result.boxes[0]).toMatchObject({ x: 44, y: -4 });
  });
});

describe("transforms", () => {
  // A 200x100 area with a 100x20 bar in its center.
  function bar(style: string) {
    return measure(`
      <div style="display: flex; align-items: center; justify-content: center;
        width: 200px; height: 100px">
        <div style="width: 100px; height: 20px; background: red; ${style}"></div>
      </div>`);
  }

  test("a rotated element keeps its size and stores the angle", () => {
    expect(bar("rotate: 45deg").boxes).toEqual([
      { x: 50, y: 40, width: 100, height: 20, radius: 0, rotate: 45 },
    ]);
  });

  test("`transform: rotate()` works too", () => {
    expect(bar("transform: rotate(30deg)").boxes[0]?.rotate).toBe(30);
  });

  test("a scaled element gets the scaled size and no angle", () => {
    expect(bar("scale: 2").boxes).toEqual([
      { x: 0, y: 30, width: 200, height: 40, radius: 0 },
    ]);
  });
});

describe("placement in the parent", () => {
  test.each([
    ["margin: 0 auto", "center"],
    ["margin-left: auto", "right"],
    ["", undefined],
  ])("`%s` → align: %s", (style, align) => {
    const result = measure(
      `<div style="width: 100px; height: 20px; ${style}"></div>`,
    );
    expect(result.align).toBe(align);
  });

  test("auto margins in a flex row are not stored", () => {
    container.style.display = "flex";
    const result = measure(
      '<div style="width: 100px; height: 20px; margin: 0 auto"></div>',
    );
    expect(result.align).toBeUndefined();
  });

  test.each([
    ["flex-shrink: 0", 0],
    ["", 1],
  ])("`%s` → flexShrink: %s", (style, flexShrink) => {
    const result = measure(
      `<div style="width: 100px; height: 20px; ${style}"></div>`,
    );
    expect(result.flexShrink).toBe(flexShrink);
  });
});

describe("Shadow DOM", () => {
  customElements.define(
    "test-card",
    class extends HTMLElement {
      connectedCallback() {
        if (this.shadowRoot) return;
        this.attachShadow({ mode: "open" }).innerHTML = `
          <div style="width: 200px; padding: 10px; background: red">
            <slot></slot>
          </div>`;
      }
    },
  );

  test("measures the shadow root and the slotted content", () => {
    const result = measure("<test-card><span>Slotted</span></test-card>");
    expect(result.boxes).toHaveLength(2);
    expect(result.boxes[0]).toMatchObject({ x: 0, y: 0, width: 220 });
    // The slotted text line inside the padding.
    expect(result.boxes[1]).toMatchObject({ x: 10 });
  });
});
