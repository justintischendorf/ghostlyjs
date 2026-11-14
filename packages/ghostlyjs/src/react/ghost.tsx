import type { ReactNode } from "react";

import type { GhostlyMeasurement } from "../core/types";
import { useGhostlyData } from "./ghostly-provider";
import type { GhostProps, GhostVariant } from "./types";

// <Ghost> renders its children when `isLoading` is false, otherwise a
// skeleton sized by the measurement stored under its `name`.
export function Ghost({
  children,
  name,
  isLoading,
  variant,
}: GhostProps): ReactNode {
  const measurement = useGhostlyData()[name];

  if (!isLoading) {
    // `display: contents` removes the wrapper from the layout, so the
    // children keep the parent's flex/grid context and percentage sizes.
    return <div style={{ display: "contents" }}>{children}</div>;
  }
  return (
    <GhostSkeleton name={name} variant={variant} measurement={measurement} />
  );
}

// <GhostSkeleton> renders the placeholder shape chosen by `variant`.
function GhostSkeleton({
  name,
  variant,
  measurement,
}: {
  name: string;
  variant?: GhostVariant;
  measurement?: GhostlyMeasurement;
}): ReactNode {
  // Measured size from the provider. `flexShrink: 0` keeps that size in a
  // flex row. Without a measurement for `name`, the div keeps its natural size.
  const style = measurement
    ? { width: measurement.width, height: measurement.height, flexShrink: 0 }
    : undefined;

  switch (variant) {
    // Rectangle for a block of content, e.g. a card or an image.
    case "block":
      return <div style={style}>{`Block skeleton for ${name}`}</div>;
    // Line for text.
    case "text":
      return <div style={style}>{`Text skeleton for ${name}`}</div>;
    // Circle for an avatar or profile picture.
    case "circle":
      return <div style={style}>{`Circle skeleton for ${name}`}</div>;
    // Generic placeholder; also used when no `variant` is set.
    default:
      return <div style={style}>{`Default skeleton for ${name}`}</div>;
  }
}
