// How a <Ghost> changes with the window width. `ghostly measure` measures
// it across a breakpoint range, exact to the pixel, and splits the
// range into segments: in one segment the layout stays the same (the same
// boxes, nothing wraps) and every position and size changes linearly with
// the window width (a column that grows, a chart that keeps its aspect
// ratio). Each segment becomes one measurement whose sizes are stored as
// `calc(px + percent)`, so the skeleton is exact at every width of it.

import type { Calc, GhostBoxContent, GhostBoxMeasurement } from "../core/types";

// One measurement at one window width.
export type Sample = {
  // The window width.
  width: number;
  measurement: GhostBoxMeasurement;
  // See `parentWidthOf`.
  parentWidth?: number;
};

// Sizes that differ by at most this many pixels are the same. Apps round
// some sizes to whole pixels (a chart's height), so a size that grows
// with the width can be up to a pixel off the line.
const TOLERANCE = 1;

// The same boxes: as many, in the same order, turned the same. Where they
// are is up to `isLinear`: text that wraps or buttons that move to the next
// row jump down, which no line predicts.
export function sameLayout(
  a: GhostBoxMeasurement,
  b: GhostBoxMeasurement,
): boolean {
  return (
    a.count === b.count &&
    a.boxes.length === b.boxes.length &&
    a.boxes.every(
      (box, index) => (box.rotate ?? 0) === (b.boxes[index]?.rotate ?? 0),
    )
  );
}

// The numbers that may change with the width: the frame width, the parent
// width, the frame height and the place and size of every box.
function valuesOf(sample: Sample): number[] {
  return [
    sample.measurement.width,
    sample.parentWidth ?? 0,
    sample.measurement.height,
    ...sample.measurement.boxes.flatMap((box) => [
      box.x,
      box.y,
      box.width,
      box.height,
    ]),
  ];
}

// Whether the line from `first` to `last` predicts every sample. The
// skeleton changes its sizes with the width of the frame, so if that stays
// the same, nothing else may change.
function isLinear(samples: Sample[], first: Sample, last: Sample): boolean {
  if (last.width === first.width) return true;
  const start = valuesOf(first);
  const end = valuesOf(last);
  const frameFixed = Math.abs((end[0] ?? 0) - (start[0] ?? 0)) <= TOLERANCE;
  if (
    frameFixed &&
    start.some(
      (value, index) =>
        index >= 2 && Math.abs((end[index] ?? 0) - value) > TOLERANCE,
    )
  ) {
    return false;
  }
  return samples.every((sample) => {
    const t = (sample.width - first.width) / (last.width - first.width);
    return valuesOf(sample).every((value, index) => {
      const a = start[index] ?? 0;
      const b = end[index] ?? 0;
      return Math.abs(a + (b - a) * t - value) <= TOLERANCE;
    });
  });
}

// The samples of one segment: the first one is where it starts.
export type Segment = Sample[];

// Whether a sample continues a segment: same layout, and the line from
// the segment's start to the sample still predicts every sample between.
export function fits(segment: Segment, sample: Sample): boolean {
  const first = segment[0];
  return (
    !!first &&
    sameLayout(first.measurement, sample.measurement) &&
    (first.parentWidth === undefined) === (sample.parentWidth === undefined) &&
    isLinear(segment, first, sample)
  );
}

// Adds the sample of the next window width: to the last segment if it
// continues it, else as the start of a new one. Samples must come in
// order of width.
export function addSample(segments: Segment[], sample: Sample): void {
  const segment = segments.at(-1);
  if (segment && fits(segment, sample)) segment.push(sample);
  else segments.push([sample]);
}

const round = (value: number, digits: number) =>
  Math.round(value * 10 ** digits) / 10 ** digits;

// `value` at size `size`, changing by `slope` per pixel of the size: as
// `[px, percent]` of the size. Undefined if it doesn't change.
function calcOf(value: number, slope: number, size: number): Calc | undefined {
  if (Math.abs(slope) < 0.0005) return undefined;
  return [round(value - slope * size, 1), round(slope * 100, 4)];
}

// The measurement of a segment: the one at its start, plus how its sizes
// change up to its end.
export function measurementOf(segment: Segment): GhostBoxMeasurement {
  const first = segment[0];
  const last = segment.at(-1);
  if (!first || !last) throw new Error("empty segment");
  const start = first.measurement;
  const frameChange = last.measurement.width - start.width;

  let widthCalc: Calc | undefined;
  if (
    first.parentWidth !== undefined &&
    last.parentWidth !== undefined &&
    last.parentWidth !== first.parentWidth
  ) {
    widthCalc = calcOf(
      start.width,
      frameChange / (last.parentWidth - first.parentWidth),
      first.parentWidth,
    );
  }

  // Everything inside follows the width of the frame.
  const follow = (from: number, to: number) =>
    frameChange === 0
      ? undefined
      : calcOf(from, (to - from) / frameChange, start.width);
  const heightCalc = follow(start.height, last.measurement.height);
  const boxes = start.boxes.map((box, index): GhostBoxContent => {
    const end = last.measurement.boxes[index];
    if (!end) return box;
    const calcs = {
      xCalc: follow(box.x, end.x),
      yCalc: follow(box.y, end.y),
      widthCalc: follow(box.width, end.width),
      heightCalc: follow(box.height, end.height),
    };
    return {
      ...box,
      ...Object.fromEntries(
        Object.entries(calcs).filter(([, calc]) => calc !== undefined),
      ),
    };
  });

  return {
    ...start,
    fluid: true,
    ...(widthCalc && { widthCalc }),
    ...(heightCalc && { heightCalc }),
    boxes,
  };
}
