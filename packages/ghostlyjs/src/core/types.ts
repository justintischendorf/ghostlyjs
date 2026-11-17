// Framework-agnostic types of the `ghostlyjs` package.

// One visible part inside a <Ghost>: a text line, an image, a circle, ...
// All values are in pixels. x/y are relative to the <Ghost> frame, not to
// the viewport, so they stay correct when the page scrolls.
export type GhostBoxContent = {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  // Rotation in degrees, only for elements with a CSS transform.
  rotate?: number;
  // Only in a `fluid` measurement, for a box that moves or grows with the
  // width of the frame: its place and size as `[px, percent]` of the frame
  // width, e.g. `xCalc: [-100, 100]` for a 100px button at the right edge.
  // Missing means it keeps `x`, `y`, `width` or `height` in pixels.
  xCalc?: Calc;
  yCalc?: Calc;
  widthCalc?: Calc;
  heightCalc?: Calc;
};

// A length that changes with the width of a container, like CSS
// `calc(px + percent)`: `[px, percent]`. A plain array, because TypeScript
// reads arrays from an imported JSON file as `number[]`.
export type Calc = number[];

// Measured structure of one <Ghost>: its frame and the boxes inside it.
export type GhostBoxMeasurement = {
  width: number;
  height: number;
  // CSS `flex-shrink` of the content (0 for `shrink-0`), so the skeleton
  // shrinks in a flex row like the real content does.
  flexShrink?: number;
  // How the content sits in its parent when it is narrower: "center"
  // (`mx-auto`) or "right" (`ml-auto`). Missing means left. A plain string,
  // because TypeScript reads strings from an imported JSON file as `string`.
  align?: string;
  // The content takes the full width of its parent (a block element, a
  // card): the skeleton does too, also when the parent is wider than when
  // measured (a wider phone). Missing means it keeps the measured width.
  fill?: boolean;
  // Set by `ghostly measure`, which measures each width of a breakpoint
  // range: how the content changes with the width is known, so the boxes
  // use their `…Calc` sizes and keep their pixel sizes otherwise.
  // Without it (measured in the browser at one width), wide boxes stretch
  // with the frame and square-ish ones keep their size.
  fluid?: boolean;
  // Only in a `fluid` measurement: the width of the content as
  // `[px, percent]` of its parent's width, e.g. `[0, 100]` for
  // content that fills its parent, `[-120, 100]` for a `flex-1` next to a
  // 120px sidebar. Missing means `width` in pixels, or the full width with
  // `fill`.
  widthCalc?: Calc;
  // Only in a `fluid` measurement: the height as `[px, percent]` of its own
  // width, for content that grows in height with its width (an image or a
  // chart with an aspect ratio). Missing means `height` in pixels.
  heightCalc?: Calc;
  boxes: GhostBoxContent[];
  // Lists only (<Ghost count>): the boxes are those of the first item, and
  // this is how many items there were when measured.
  count?: number;
};

// Options for `measureElement`.
export type MeasureOptions = {
  // The children are the items of a list: measure only the first one and
  // count them.
  list?: boolean;
};

// The measurements of one <Ghost>, keyed by breakpoint name ("base", "sm",
// "md", ...): one per window width range it was measured in. Where the
// layout changes inside a range (buttons wrap, text takes another line),
// `ghostly measure` adds a key with the window width it starts at, like
// "base@390": from 390px up to the next key.
export type GhostlyEntry = Record<string, GhostBoxMeasurement>;

// All measured skeletons, keyed by the `name` prop of <Ghost>.
export type GhostlyData = Record<string, GhostlyEntry>;

// Breakpoint names and the minimum window width in pixels where each one
// starts, e.g. `{ sm: 640, md: 768 }`. Below the smallest one is "base".
export type Breakpoints = Record<string, number>;
