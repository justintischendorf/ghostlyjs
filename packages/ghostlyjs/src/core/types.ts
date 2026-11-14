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
};

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

// All measured skeletons, keyed by the `name` prop of <Ghost>.
export type GhostlyData = Record<string, GhostBoxMeasurement>;
