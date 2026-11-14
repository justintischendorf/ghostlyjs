// Unit tests for the breakpoint helpers: which range a width falls into,
// and which measurement shows in which range.

import { describe, expect, test } from "vitest";

import {
  breakpointCss,
  breakpointOf,
  DEFAULT_BREAKPOINTS,
  hideClass,
  rangesOf,
  variantsOf,
} from "./breakpoints";
import type { GhostBoxMeasurement } from "./types";

// Measurements told apart by their height.
const high = (height: number): GhostBoxMeasurement => ({
  width: 100,
  height,
  boxes: [],
});

describe("rangesOf", () => {
  test("starts with base and sorts by width", () => {
    expect(rangesOf({ wide: 1000, narrow: 500 })).toEqual([
      { name: "base", min: 0 },
      { name: "narrow", min: 500 },
      { name: "wide", min: 1000 },
    ]);
  });

  test("defaults to Tailwind's breakpoints", () => {
    expect(rangesOf(DEFAULT_BREAKPOINTS).map((range) => range.name)).toEqual([
      "base",
      "sm",
      "md",
      "lg",
      "xl",
      "2xl",
    ]);
  });
});

describe("breakpointOf", () => {
  test.each([
    [0, "base"],
    [639, "base"],
    [640, "sm"],
    [767, "sm"],
    [768, "md"],
    [1024, "lg"],
    [1280, "xl"],
    [1535, "xl"],
    [1536, "2xl"],
    [3000, "2xl"],
  ])("%spx → %s", (width, name) => {
    expect(breakpointOf(width, DEFAULT_BREAKPOINTS)).toBe(name);
  });

  test("works with custom breakpoints", () => {
    expect(breakpointOf(700, { tablet: 600, desktop: 1100 })).toBe("tablet");
  });
});

describe("variantsOf", () => {
  // Ranges: 0 base, 1 sm, 2 md, 3 lg, 4 xl, 5 2xl.
  const variants = (entry: Record<string, GhostBoxMeasurement>) =>
    variantsOf(entry, DEFAULT_BREAKPOINTS).map((variant) => ({
      height: variant.measurement.height,
      ranges: variant.ranges,
    }));

  test("nothing measured: no variant", () => {
    expect(variantsOf(undefined, DEFAULT_BREAKPOINTS)).toEqual([]);
    expect(variantsOf({}, DEFAULT_BREAKPOINTS)).toEqual([]);
  });

  test("one measurement shows everywhere", () => {
    expect(variants({ md: high(10) })).toEqual([
      { height: 10, ranges: [0, 1, 2, 3, 4, 5] },
    ]);
  });

  test("a range without its own uses the next smaller one", () => {
    expect(variants({ base: high(10), lg: high(20) })).toEqual([
      { height: 10, ranges: [0, 1, 2] },
      { height: 20, ranges: [3, 4, 5] },
    ]);
  });

  test("below the smallest measured range, the next larger one", () => {
    expect(variants({ md: high(10), xl: high(20) })).toEqual([
      { height: 10, ranges: [0, 1, 2, 3] },
      { height: 20, ranges: [4, 5] },
    ]);
  });

  test("equal measurements share one variant", () => {
    expect(variants({ base: high(10), md: high(20), xl: high(10) })).toEqual([
      { height: 10, ranges: [0, 1, 4, 5] },
      { height: 20, ranges: [2, 3] },
    ]);
  });

  test("measurements of unknown breakpoints are ignored", () => {
    expect(variants({ old: high(5), lg: high(20) })).toEqual([
      { height: 20, ranges: [0, 1, 2, 3, 4, 5] },
    ]);
  });
});

describe("breakpointCss", () => {
  const css = breakpointCss({ sm: 640, md: 768 });

  test("hides each class in its range only", () => {
    expect(css).toContain(
      `@media (max-width: 639.98px) { .${hideClass(0)} { display: none !important; } }`,
    );
    expect(css).toContain(
      `@media (min-width: 640px) and (max-width: 767.98px) { .${hideClass(1)}`,
    );
    expect(css).toContain(`@media (min-width: 768px) { .${hideClass(2)}`);
  });

  test("without breakpoints, base covers every width", () => {
    expect(breakpointCss({})).toBe(
      `.${hideClass(0)} { display: none !important; }`,
    );
  });
});
