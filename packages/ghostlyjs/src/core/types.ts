// Framework-agnostic types of the `ghostlyjs` package.

// One visible part inside a <Ghost>: a text line, an image, a circle, ...
// All values are in pixels. x/y are relative to the <Ghost> frame, not to
// the viewport, so they stay correct when the page scrolls.
export type GhostlyBox = {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
};

// Measured structure of one <Ghost>: its frame and the boxes inside it.
export type GhostlyMeasurement = {
  width: number;
  height: number;
  boxes: GhostlyBox[];
};

// All measured skeletons, keyed by the `name` prop of <Ghost>.
export type GhostlyData = Record<string, GhostlyMeasurement>;
