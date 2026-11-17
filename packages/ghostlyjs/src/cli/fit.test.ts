// Unit tests for splitting a breakpoint range into segments with the same
// layout and for the measurement of each segment.

import { describe, expect, test } from "vitest";

import type { GhostBoxContent, GhostBoxMeasurement } from "../core/types";
import {
  addSample,
  measurementOf,
  sameLayout,
  type Sample,
  type Segment,
} from "./fit";

const box = (
  x: number,
  width: number,
  y = 0,
  height = 20,
): GhostBoxContent => ({ x, y, width, height, radius: 0 });

const measured = (
  width: number,
  boxes: GhostBoxContent[],
  height = 20,
): GhostBoxMeasurement => ({ width, height, boxes });

// Samples at every window width from `from` to `to`.
function sweep(
  from: number,
  to: number,
  sample: (width: number) => Omit<Sample, "width">,
): Segment[] {
  const segments: Segment[] = [];
  for (let width = from; width <= to; width++) {
    addSample(segments, { width, ...sample(width) });
  }
  return segments;
}

describe("sameLayout", () => {
  test("other places and sizes are the same layout", () => {
    expect(
      sameLayout(
        measured(100, [box(0, 50)]),
        measured(200, [box(20, 90, 10, 40)], 60),
      ),
    ).toBe(true);
  });

  test.each([
    ["a box more", measured(100, [box(0, 50), box(60, 40)])],
    ["a turned box", measured(100, [{ ...box(0, 50), rotate: 10 }])],
  ])("%s is another layout", (_, other) => {
    expect(sameLayout(measured(100, [box(0, 50)]), other)).toBe(false);
  });
});

describe("addSample", () => {
  test("a layout that only grows stays one segment", () => {
    // Content filling a page with 16px padding on each side.
    const segments = sweep(320, 639, (width) => ({
      measurement: measured(width - 32, [box(0, width - 32)]),
      parentWidth: width - 32,
    }));
    expect(segments).toHaveLength(1);
  });

  test("where the layout changes, a new segment starts", () => {
    // Two buttons below each other, next to each other from 390px on.
    const segments = sweep(320, 639, (width) => ({
      measurement:
        width < 390
          ? measured(width, [box(0, width), box(0, width, 40)], 80)
          : measured(width, [box(0, width / 2), box(width / 2, width / 2)], 40),
      parentWidth: width,
    }));
    expect(segments.map((segment) => segment[0]?.width)).toEqual([320, 390]);
  });

  test("text that wraps to another line starts a new segment", () => {
    // A box below a paragraph: one line, two lines from 400px down.
    const segments = sweep(320, 500, (width) => ({
      measurement: measured(width, [box(0, 50, width < 400 ? 48 : 24)], 80),
      parentWidth: width,
    }));
    expect(segments.map((segment) => segment[0]?.width)).toEqual([320, 400]);
  });

  test("a chart that keeps its aspect ratio stays one segment", () => {
    const segments = sweep(320, 639, (width) => ({
      measurement: measured(width, [box(0, width, 0, width / 2)], width / 2),
      parentWidth: width,
    }));
    expect(segments).toHaveLength(1);
    const measurement = measurementOf(segments[0]!);
    expect(measurement.heightCalc).toEqual([0, 50]);
    expect(measurement.boxes[0]?.heightCalc).toEqual([0, 50]);
  });

  test("a frame of fixed width can't change inside", () => {
    // Moves with the window (vw), not with the frame: every width its own.
    const segments = sweep(400, 403, (width) => ({
      measurement: measured(200, [box((width - 400) * 5, 50)]),
      parentWidth: 300,
    }));
    expect(segments).toHaveLength(4);
  });

  test("where the growth stops (max-width), a new segment starts", () => {
    const segments = sweep(600, 1000, (width) => {
      const frame = Math.min(width, 800);
      return {
        measurement: measured(frame, [box(0, frame)]),
        parentWidth: width,
      };
    });
    expect(segments).toHaveLength(2);
    // Within the tolerance of a pixel.
    expect(segments[1]?.[0]?.width).toBeGreaterThanOrEqual(800);
    expect(segments[1]?.[0]?.width).toBeLessThanOrEqual(802);
  });
});

describe("measurementOf", () => {
  test("text that filled its line once, then kept its width: no fill", () => {
    const [segment] = sweep(320, 400, (width) => ({
      measurement: {
        ...measured(300, [box(0, 300)]),
        ...(width === 320 && { fill: true }),
      },
      parentWidth: width - 20,
    }));
    const measurement = measurementOf(segment!);
    expect(measurement.fill).toBeUndefined();
    expect(measurement.widthCalc).toBeUndefined();
  });

  test("content that fills its parent: 100% of it", () => {
    const [segment] = sweep(320, 400, (width) => ({
      measurement: measured(width, [box(0, width)]),
      parentWidth: width,
    }));
    const measurement = measurementOf(segment!);
    expect(measurement).toMatchObject({
      fluid: true,
      width: 320,
      widthCalc: [0, 100],
    });
    expect(measurement.boxes[0]).toMatchObject({ widthCalc: [0, 100] });
    expect(measurement.boxes[0]?.xCalc).toBeUndefined();
  });

  test("`flex-1` next to a 120px sidebar: 100% minus 120px", () => {
    const [segment] = sweep(600, 700, (width) => ({
      measurement: measured(width - 120, [box(0, 40, 0, 40)]),
      parentWidth: width,
    }));
    const measurement = measurementOf(segment!);
    expect(measurement.widthCalc).toEqual([-120, 100]);
    // The 40px icon keeps its size and place.
    expect(measurement.boxes[0]?.xCalc).toBeUndefined();
    expect(measurement.boxes[0]?.widthCalc).toBeUndefined();
  });

  test("a button pushed to the right edge moves, keeps its width", () => {
    const [segment] = sweep(400, 500, (width) => ({
      measurement: measured(width, [box(width - 100, 100)]),
      parentWidth: width,
    }));
    const [button] = measurementOf(segment!).boxes;
    expect(button?.xCalc).toEqual([-100, 100]);
    expect(button?.widthCalc).toBeUndefined();
  });

  test("two columns: half of the frame each", () => {
    const [segment] = sweep(400, 500, (width) => ({
      measurement: measured(width, [
        box(0, width / 2),
        box(width / 2, width / 2),
      ]),
      parentWidth: width,
    }));
    const [left, right] = measurementOf(segment!).boxes;
    expect(left?.widthCalc).toEqual([0, 50]);
    expect(right?.xCalc).toEqual([0, 50]);
  });

  test("a fixed width stays in pixels", () => {
    const [segment] = sweep(400, 500, () => ({
      measurement: measured(200, [box(0, 200)]),
      parentWidth: 300,
    }));
    const measurement = measurementOf(segment!);
    expect(measurement.fluid).toBe(true);
    expect(measurement.widthCalc).toBeUndefined();
    expect(measurement.boxes[0]?.widthCalc).toBeUndefined();
  });

  test("a parent of unknown width (a grid cell): no widthCalc", () => {
    const [segment] = sweep(400, 500, (width) => ({
      measurement: measured(width / 2, [box(0, width / 2)]),
    }));
    expect(measurementOf(segment!).widthCalc).toBeUndefined();
  });
});
