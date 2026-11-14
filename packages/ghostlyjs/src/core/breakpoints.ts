// Responsive skeletons: a <Ghost> is measured once per window width range
// (breakpoint). All measured variants are rendered, and CSS media queries
// show the one for the current width. So the server, which doesn't know the
// width, renders the same HTML as the browser: no hydration errors.

import type { Breakpoints, GhostBoxMeasurement, GhostlyEntry } from "./types";

// Tailwind's default breakpoints: the minimum window width in pixels.
export const DEFAULT_BREAKPOINTS: Breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
};

// The range below the smallest breakpoint (Tailwind styles without prefix).
export const BASE = "base";

// One window width range: from `min` up to (not including) the next one.
export type BreakpointRange = { name: string; min: number };

// All ranges, smallest first, starting with `base` at 0.
export function rangesOf(breakpoints: Breakpoints): BreakpointRange[] {
  const sorted = Object.entries(breakpoints)
    .map(([name, min]) => ({ name, min }))
    .sort((a, b) => a.min - b.min);
  return [{ name: BASE, min: 0 }, ...sorted];
}

// The name of the range that contains `width`, e.g. 1280 → "xl".
export function breakpointOf(width: number, breakpoints: Breakpoints): string {
  let name = BASE;
  for (const range of rangesOf(breakpoints)) {
    if (width >= range.min) name = range.name;
  }
  return name;
}

// One skeleton variant and the ranges (indexes into `rangesOf`) it shows in.
export type GhostVariant = {
  measurement: GhostBoxMeasurement;
  ranges: number[];
};

// Which measurement shows in which range. A range without its own
// measurement uses the next smaller measured one (mobile first, like CSS),
// or the next larger one if there is none. Ranges with the same
// measurement share one variant, so the HTML stays small.
export function variantsOf(
  entry: GhostlyEntry | undefined,
  breakpoints: Breakpoints,
): GhostVariant[] {
  const ranges = rangesOf(breakpoints);
  const measured = ranges.map((range) => entry?.[range.name]);
  if (!measured.some(Boolean)) return [];

  const variants = new Map<string, GhostVariant>();
  for (const index of ranges.keys()) {
    // Its own, else the next smaller, else the next larger measurement.
    const smaller = measured
      .slice(0, index + 1)
      .reverse()
      .find(Boolean);
    const measurement = smaller ?? measured.slice(index).find(Boolean);
    if (!measurement) continue;
    const key = JSON.stringify(measurement);
    const variant = variants.get(key) ?? { measurement, ranges: [] };
    variant.ranges.push(index);
    variants.set(key, variant);
  }
  return [...variants.values()];
}

// The class that hides an element in one range. Indexes, not names, so any
// breakpoint name gives a valid class.
export function hideClass(range: number): string {
  return `ghostly-hide-${range}`;
}

// CSS that hides each `hideClass` in its range. A variant gets the classes
// of all ranges it doesn't show in.
export function breakpointCss(breakpoints: Breakpoints): string {
  const ranges = rangesOf(breakpoints);
  return ranges
    .map((range, index) => {
      const next = ranges[index + 1];
      const conditions = [
        range.min > 0 && `(min-width: ${range.min}px)`,
        // .02px below the next one, like Bootstrap: no gap and no overlap.
        next && `(max-width: ${next.min - 0.02}px)`,
      ].filter(Boolean);
      const rule = `.${hideClass(index)} { display: none !important; }`;
      return conditions.length > 0
        ? `@media ${conditions.join(" and ")} { ${rule} }`
        : rule;
    })
    .join("\n");
}
