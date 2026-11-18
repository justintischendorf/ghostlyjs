// Unit tests for the breakpoint helpers: which range a width falls into,
// and which measurement shows in which range.

import { describe, expect, test } from "vitest";

import {
  boundariesOf,
  breakpointCss,
  breakpointOf,
  DEFAULT_BREAKPOINTS,
  fromClass,
  keyAt,
  minWidthOf,
  rangesOf,
  toClass,
  variantClasses,
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

describe("minWidthOf", () => {
  test.each([
    ["base", 0],
    ["md", 768],
    ["base@390", 390],
    ["md@800", 800],
    // Outside of its range, or of a breakpoint that doesn't exist.
    ["base@700", undefined],
    ["md@768", undefined],
    ["old", undefined],
    ["base@abc", undefined],
  ])("%s → %s", (key, width) => {
    expect(minWidthOf(key, DEFAULT_BREAKPOINTS)).toBe(width);
  });
});

describe("variantsOf", () => {
  const variants = (entry: Record<string, GhostBoxMeasurement>) =>
    variantsOf(entry, DEFAULT_BREAKPOINTS).map(({ measurement, from, to }) => ({
      height: measurement.height,
      from,
      to,
    }));

  test("nothing measured: no variant", () => {
    expect(variantsOf(undefined, DEFAULT_BREAKPOINTS)).toEqual([]);
    expect(variantsOf({}, DEFAULT_BREAKPOINTS)).toEqual([]);
  });

  test("one measurement shows everywhere", () => {
    expect(variants({ md: high(10) })).toEqual([
      { height: 10, from: 0, to: undefined },
    ]);
  });

  test("each one up to the next measured one", () => {
    expect(variants({ base: high(10), lg: high(20) })).toEqual([
      { height: 10, from: 0, to: 1024 },
      { height: 20, from: 1024, to: undefined },
    ]);
  });

  test("below the smallest measured one, the smallest", () => {
    expect(variants({ md: high(10), xl: high(20) })).toEqual([
      { height: 10, from: 0, to: 1280 },
      { height: 20, from: 1280, to: undefined },
    ]);
  });

  test("widths inside a range get their own variant", () => {
    expect(
      variants({ base: high(10), "base@390": high(20), sm: high(30) }),
    ).toEqual([
      { height: 10, from: 0, to: 390 },
      { height: 20, from: 390, to: 640 },
      { height: 30, from: 640, to: undefined },
    ]);
  });

  test("equal neighbours share one variant", () => {
    expect(variants({ base: high(10), md: high(10), xl: high(20) })).toEqual([
      { height: 10, from: 0, to: 1280 },
      { height: 20, from: 1280, to: undefined },
    ]);
  });

  test("measurements of unknown breakpoints are ignored", () => {
    expect(variants({ old: high(5), lg: high(20) })).toEqual([
      { height: 20, from: 0, to: undefined },
    ]);
  });
});

describe("keyAt", () => {
  const entry = { base: high(10), "base@390": high(20), md: high(30) };

  test.each([
    [320, "base"],
    [389, "base"],
    [390, "base@390"],
    [639, "base@390"],
    // Not measured there: the breakpoint itself.
    [700, "sm"],
    [900, "md"],
  ])("%spx → %s", (width, key) => {
    expect(keyAt(width, entry, DEFAULT_BREAKPOINTS)).toBe(key);
  });
});

describe("CSS", () => {
  test("every breakpoint and every width inside one is a boundary", () => {
    expect(
      boundariesOf(
        { a: { base: high(1), "base@390": high(2) }, b: { "md@800": high(3) } },
        { sm: 640, md: 768 },
      ),
    ).toEqual([390, 640, 768, 800]);
  });

  test("a variant is hidden below its start and from its end on", () => {
    const css = breakpointCss([390]);
    expect(css).toContain(
      `@media (max-width: 389.98px) { .${fromClass(390)} { display: none !important; } }`,
    );
    expect(css).toContain(
      `@media (min-width: 390px) { .${toClass(390)} { display: none !important; } }`,
    );
  });

  test("the classes of a variant", () => {
    const measurement = high(1);
    expect(variantClasses({ measurement, from: 0, to: 390 })).toBe(
      toClass(390),
    );
    expect(variantClasses({ measurement, from: 390, to: 640 })).toBe(
      `${fromClass(390)} ${toClass(640)}`,
    );
    expect(variantClasses({ measurement, from: 640 })).toBe(fromClass(640));
    expect(variantClasses({ measurement, from: 0 })).toBe("");
  });
});
