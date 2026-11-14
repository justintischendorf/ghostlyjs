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
  if (!measurement) return <div />;
  const percent = (px: number) => `${(px / measurement.width) * 100}%`;

  return (
    // Fills the available width, but never gets wider than measured. So it
    // shrinks with a narrower column instead of overlapping its neighbour.
    // In a flex row it doesn't grow (`flex-1` would split the row evenly,
    // the real content takes as much as it needs), so it keeps the measured
    // width and its neighbours get the rest.
    <div
      style={{
        position: "relative",
        width: "100%",
        maxWidth: measurement.width,
        height: measurement.height,
        flex: `0 ${measurement.flexShrink ?? 1} auto`,
      }}
    >
      {measurement.boxes.map((box, index) => (
        <div
          key={index}
          style={{
            position: "absolute",
            left: percent(box.x),
            top: box.y,
            // Wide boxes (cards, text lines) stretch with the frame. Square-ish
            // boxes (avatars, icons) keep their size, so circles stay round,
            // but never reach past the frame's right edge.
            width:
              box.width > box.height * 1.5 ? percent(box.width) : box.width,
            maxWidth: percent(measurement.width - box.x),
            height: box.height,
            borderRadius: box.radius,
            // The text color, faint: grey on light and on dark pages.
            // Overlapping boxes (text on a card) stack and look darker.
            backgroundColor: "currentColor",
            opacity: 0.1,
          }}
        />
      ))}
    </div>
  );
}
