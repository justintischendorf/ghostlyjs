import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { DEFAULT_PORT, measureElement } from "../core";
import type { GhostBoxMeasurement } from "../core/types";
import { useGhostlyData } from "./ghostly-provider";
import type { GhostProps } from "./types";

// <Ghost> renders its children when `isLoading` is false, otherwise a
// skeleton built from the measurement stored under its `name`.
export function Ghost({ children, name, isLoading }: GhostProps): ReactNode {
  const stored = useGhostlyData()[name];
  const [measured, setMeasured] = useState<GhostBoxMeasurement>();
  const ref = useRef<HTMLDivElement>(null);

  // Dev only: measure the real content after React rendered it and before
  // the browser paints, so the layout is final.
  useLayoutEffect(() => {
    if (isLoading || !ref.current) return;
    if (process.env.NODE_ENV !== "development") return;

    const measurement = measureElement(ref.current);
    setMeasured(measurement);
    sendToCollector(JSON.stringify({ name, measurement }));
  }, [isLoading, name]);

  if (!isLoading) {
    // `display: contents` keeps the parent's flex/grid layout intact.
    return (
      <div ref={ref} style={{ display: "contents" }}>
        {children}
      </div>
    );
  }
  // A fresh measurement wins; otherwise the stored one from the provider.
  return <GhostSkeleton measurement={measured ?? stored} />;
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
  measurement,
}: {
  measurement?: GhostBoxMeasurement;
}): ReactNode {
  // Never measured yet: one bar, so the user still sees that something
  // loads. It is replaced once the real content was shown in dev.
  if (!measurement) {
    return <div className="ghostly-placeholder" />;
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
      className="ghostly-skeleton"
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
