// Framework-agnostic types of the `ghostlyjs` package.

// Measured size of one element in pixels, as returned by `measureElement`.
export type GhostlyMeasurement = {
  width: number;
  height: number;
};

// All measured skeletons, keyed by the `name` prop of <Ghostly>.
export type GhostlyData = Record<string, GhostlyMeasurement>;
