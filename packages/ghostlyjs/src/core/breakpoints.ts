// Responsive skeletons: a <Ghost> is measured once per window width range
// (breakpoint), plus once more where its layout changes inside a range
// ("base@390"). All measured variants are rendered, and CSS media queries
// show the one for the current width. So the server, which doesn't know
// the width, renders the same HTML as the browser: no hydration errors.

import type {
  Breakpoints,
  GhostBoxMeasurement,
  GhostlyData,
  GhostlyEntry,
} from "./types";

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

// Between a breakpoint and the window width of a key like "base@390".
export const WIDTH_SEPARATOR = "@";

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

// The breakpoint of a key: "base" for "base" and "base@390".
export function breakpointOfKey(key: string): string {
  return key.split(WIDTH_SEPARATOR)[0] ?? key;
}

// The window width from which the measurement of a key shows: the
// breakpoint's own minimum, or the width after "@". Undefined for keys of
// breakpoints that don't exist (anymore), and for widths outside their
// breakpoint's range.
export function minWidthOf(
  key: string,
  breakpoints: Breakpoints,
): number | undefined {
  const [name, width, ...rest] = key.split(WIDTH_SEPARATOR);
  const ranges = rangesOf(breakpoints);
  const index = ranges.findIndex((range) => range.name === name);
  const range = ranges[index];
  if (!range || rest.length > 0) return undefined;
  if (width === undefined) return range.min;
  const min = Number(width);
  const next = ranges[index + 1]?.min ?? Infinity;
  return Number.isInteger(min) && min > range.min && min < next
    ? min
    : undefined;
}

// One skeleton variant: shown from window width `from` up to (not
// including) `to`; no `to` means every larger width.
export type GhostVariant = {
  measurement: GhostBoxMeasurement;
  from: number;
  to?: number;
};

// Which measurement shows at which width. Each one shows from its own
// width up to the next measured one (mobile first, like CSS); the smallest
// one also below its width. Neighbours with the same measurement share one
// variant, so the HTML stays small.
export function variantsOf(
  entry: GhostlyEntry | undefined,
  breakpoints: Breakpoints,
): GhostVariant[] {
  const measured = Object.entries(entry ?? {})
    .map(([key, measurement]) => ({
      min: minWidthOf(key, breakpoints),
      measurement,
    }))
    .filter(
      (item): item is { min: number; measurement: GhostBoxMeasurement } =>
        item.min !== undefined,
    )
    .sort((a, b) => a.min - b.min);

  const variants: GhostVariant[] = [];
  for (const [index, { measurement }] of measured.entries()) {
    const from = index === 0 ? 0 : (measured[index]?.min ?? 0);
    const to = measured[index + 1]?.min;
    const last = variants.at(-1);
    if (
      last &&
      JSON.stringify(last.measurement) === JSON.stringify(measurement)
    ) {
      last.to = to;
      continue;
    }
    variants.push(
      to === undefined ? { measurement, from } : { measurement, from, to },
    );
  }
  return variants;
}

// The key whose measurement shows at `width`, e.g. "base@390" at 400px.
// Without a measured key there, the breakpoint of the width.
export function keyAt(
  width: number,
  entry: GhostlyEntry | undefined,
  breakpoints: Breakpoints,
): string {
  const breakpoint = breakpointOf(width, breakpoints);
  let found = breakpoint;
  let foundMin = -1;
  for (const key of Object.keys(entry ?? {})) {
    if (breakpointOfKey(key) !== breakpoint) continue;
    const min = minWidthOf(key, breakpoints);
    if (min !== undefined && min <= width && min > foundMin) {
      found = key;
      foundMin = min;
    }
  }
  return found;
}

// Every width where a variant starts or ends: the breakpoints and the
// widths inside them of all measurements. The CSS needs a rule for each.
export function boundariesOf(
  data: GhostlyData,
  breakpoints: Breakpoints,
): number[] {
  const widths = new Set(Object.values(breakpoints));
  for (const entry of Object.values(data)) {
    for (const key of Object.keys(entry)) {
      const min = minWidthOf(key, breakpoints);
      if (min !== undefined) widths.add(min);
    }
  }
  return [...widths].filter((width) => width > 0).sort((a, b) => a - b);
}

// The classes that hide a variant below `from` and from `to` on.
export function fromClass(width: number): string {
  return `ghostly-from-${width}`;
}

export function toClass(width: number): string {
  return `ghostly-to-${width}`;
}

// The classes of a variant: hidden outside of its widths.
export function variantClasses({ from, to }: GhostVariant): string {
  return [from > 0 && fromClass(from), to !== undefined && toClass(to)]
    .filter(Boolean)
    .join(" ");
}

// CSS that hides each `fromClass` below its width and each `toClass` from
// its width on. .02px below, like Bootstrap: no gap and no overlap.
export function breakpointCss(widths: number[]): string {
  return widths
    .map(
      (width) =>
        `@media (max-width: ${width - 0.02}px) { .${fromClass(width)} { display: none !important; } }\n` +
        `@media (min-width: ${width}px) { .${toClass(width)} { display: none !important; } }`,
    )
    .join("\n");
}
