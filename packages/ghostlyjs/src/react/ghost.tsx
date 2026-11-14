import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { measureElement } from "../core";
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
    setMeasured(measureElement(ref.current));
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

function GhostSkeleton({
  measurement,
}: {
  measurement?: GhostBoxMeasurement;
}): ReactNode {
  // `flexShrink: 0` keeps the measured size in a flex row.
  const style = measurement
    ? { width: measurement.width, height: measurement.height, flexShrink: 0 }
    : undefined;

  return (
    <div style={{ ...style, position: "relative" }}>
      {measurement?.boxes.map((box, index) => (
        <div
          key={index}
          style={{
            position: "absolute",
            left: box.x,
            top: box.y,
            width: box.width,
            height: box.height,
            borderRadius: box.radius,
            backgroundColor: "rgba(0, 0, 0, 0.1)",
          }}
        />
      ))}
    </div>
  );
}
