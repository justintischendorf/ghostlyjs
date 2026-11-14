import type { ReactNode } from "react";

import type { GhostlyMeasurement } from "../core/types";
import { useGhostlyData } from "./ghostly-provider";
import type { GhostProps } from "./types";

// <Ghost> renders its children when `isLoading` is false, otherwise a
// skeleton sized by the measurement stored under its `name`.
export function Ghost({ children, name, isLoading }: GhostProps): ReactNode {
  const measurement = useGhostlyData()[name];

  if (!isLoading) {
    // `display: contents` removes the wrapper from the layout, so the
    // children keep the parent's flex/grid context and percentage sizes.
    return <div style={{ display: "contents" }}>{children}</div>;
  }
  return <GhostSkeleton name={name} measurement={measurement} />;
}

// <GhostSkeleton> renders the placeholder for one measured <Ghost>.
function GhostSkeleton({
  name,
  measurement,
}: {
  name: string;
  measurement?: GhostlyMeasurement;
}): ReactNode {
  // Measured size from the provider. `flexShrink: 0` keeps that size in a
  // flex row. Without a measurement for `name`, the div keeps its natural size.
  const style = measurement
    ? { width: measurement.width, height: measurement.height, flexShrink: 0 }
    : undefined;

  return <div style={style}>{`Skeleton for ${name}`}</div>;
}
