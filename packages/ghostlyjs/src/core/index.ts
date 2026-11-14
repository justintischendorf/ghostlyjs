// Public entry of `ghostlyjs/core`: types, measuring and generating.

// Default port of the `ghostly dev` collector.
export const DEFAULT_PORT = 6767;

// Export the framework-agnostic types of the `ghostlyjs` package.
export type { GhostlyBox, GhostlyData, GhostlyMeasurement } from "./types";

// Measure the position and size of an HTML element.
export function measureElement(element: HTMLElement): DOMRect {
  return element.getBoundingClientRect();
}
