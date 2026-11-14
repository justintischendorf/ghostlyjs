import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { DEFAULT_PORT, measureElement } from "../core";
import {
  breakpointOf,
  hideClass,
  rangesOf,
  variantsOf,
} from "../core/breakpoints";
import type { GhostBoxMeasurement, GhostlyEntry } from "../core/types";
import { useGhostly } from "./ghostly-provider";
import type { GhostProps } from "./types";

// <Ghost> renders its children when `isLoading` is false, otherwise a
// skeleton built from the measurement stored under its `name`.
export function Ghost({
  children,
  name,
  isLoading,
  count,
}: GhostProps): ReactNode {
  const { data, breakpoints } = useGhostly();
  const isList = count !== undefined;
  // Fresh measurements of this page load, per breakpoint.
  const [measured, setMeasured] = useState<GhostlyEntry>({});
  const ref = useRef<HTMLDivElement>(null);

  // Dev only: measure the real content after React rendered it and before
  // the browser paints, so the layout is final.
  useLayoutEffect(() => {
    if (isLoading || !ref.current) return;
    if (process.env.NODE_ENV !== "development") return;

    const measurement = measureElement(ref.current, { list: isList });
    // `innerWidth` includes the scrollbar, like the width media queries see.
    const breakpoint = breakpointOf(window.innerWidth, breakpoints);
    setMeasured((previous) => ({ ...previous, [breakpoint]: measurement }));
    sendToCollector(JSON.stringify({ name, breakpoint, measurement }));
  }, [isLoading, name, isList, breakpoints]);

  if (!isLoading) {
    // `display: contents` keeps the parent's flex/grid layout intact.
    // `data-ghost` shows in the browser's dev tools which <Ghost> it is.
    return (
      <div ref={ref} data-ghost={name} style={{ display: "contents" }}>
        {children}
      </div>
    );
  }
  // Fresh measurements win over the stored ones from the provider.
  const entry = { ...data[name], ...measured };
  const variants = variantsOf(entry, breakpoints);
  // Never measured: no variant, one placeholder (per list item).
  if (variants.length === 0) {
    return repeat(isList ? count : 1, undefined, (key) => (
      <GhostSkeleton key={key} name={name} />
    ));
  }

  // One skeleton per variant, each hidden by CSS outside its breakpoints.
  // A list: one skeleton per item, side by side in the list's container, so
  // its gap and grid place them like the real items.
  const ranges = rangesOf(breakpoints);
  return variants.flatMap(({ measurement, ranges: shown }) => {
    const hidden = ranges
      .map((_, index) => index)
      .filter((index) => !shown.includes(index))
      .map(hideClass)
      .join(" ");
    return repeat(isList ? count : 1, measurement, (key) => (
      <GhostSkeleton
        key={`${shown[0]}-${key}`}
        name={name}
        measurement={measurement}
        className={hidden}
      />
    ));
  });
}

// Renders `count` items: a number, or `true` for as many as measured. At
// least one, so an empty list when measured still shows that something
// loads.
function repeat(
  count: number | true | undefined,
  measurement: GhostBoxMeasurement | undefined,
  render: (key: number) => ReactNode,
): ReactNode[] {
  const times = count === true ? (measurement?.count ?? 1) : (count ?? 1);
  return Array.from({ length: Math.max(1, times) }, (_, key) => render(key));
}

// Whether `ghostly dev` answered the first request of this page load.
let collectorOnline: Promise<boolean> | undefined;

// Sends a measurement to `ghostly dev`, which stores it in `ghostly.json`.
// Only the first <Ghost> tries; the others wait for its result. So without
// the collector there is one failed request per page load, not one per
// <Ghost>. Started the collector later? Reload the page.
function sendToCollector(body: string): void {
  const send = () =>
    fetch(`http://localhost:${DEFAULT_PORT}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body,
    }).then(
      () => true,
      () => false,
    );

  if (!collectorOnline) {
    collectorOnline = send();
    return;
  }
  void collectorOnline.then((online) => online && send());
}

function GhostSkeleton({
  name,
  measurement,
  className = "",
}: {
  name: string;
  measurement?: GhostBoxMeasurement;
  // Hides it outside its breakpoints.
  className?: string;
}): ReactNode {
  // Never measured yet: one bar, so the user still sees that something
  // loads. It is replaced once the real content was shown in dev.
  if (!measurement) {
    return <div className="ghostly-placeholder" data-ghost={name} />;
  }
  const { width } = measurement;
  const percent = (px: number) => `${(px / width) * 100}%`;

  return (
    // Fills the available width, but never gets wider than measured. So it
    // shrinks with a narrower column instead of overlapping its neighbour.
    // In a flex row it doesn't grow (`flex-1` would split the row evenly,
    // the real content takes as much as it needs), so it keeps the measured
    // width and its neighbours get the rest.
    <div
      className={`ghostly-skeleton ${className}`.trim()}
      data-ghost={name}
      style={{
        width: "100%",
        maxWidth: width,
        height: measurement.height,
        flex: `0 ${measurement.flexShrink ?? 1} auto`,
        // Same auto margins as the content (`mx-auto`, `ml-auto`).
        marginLeft: measurement.align ? "auto" : undefined,
        marginRight: measurement.align === "center" ? "auto" : undefined,
      }}
    >
      {measurement.boxes.map((box, index) => (
        <div
          key={index}
          className="ghostly-box"
          style={{
            left: percent(box.x),
            top: box.y,
            // Wide boxes (cards, text lines) stretch with the frame. Square-ish
            // boxes (avatars, icons) keep their size, so circles stay round,
            // but never reach past the frame's right edge. Boxes that already
            // stuck out when measured (a badge on a corner) stay as they are.
            width:
              box.width > box.height * 1.5 ? percent(box.width) : box.width,
            maxWidth:
              box.x + box.width <= width ? percent(width - box.x) : undefined,
            height: box.height,
            borderRadius: box.radius,
            transform: box.rotate ? `rotate(${box.rotate}deg)` : undefined,
          }}
        />
      ))}
    </div>
  );
}
