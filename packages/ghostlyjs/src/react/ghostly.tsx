import type { ReactNode } from "react";

import type { GhostlyMeasurement } from "../core/types";
import { useGhostlyData } from "./ghostly-provider";
import type { GhostlyProps, GhostlyVariant } from "./types";

// <Ghostly> renders its children when `isLoading` is false, otherwise a
// skeleton sized by the measurement stored under its `name`.
export function Ghostly({
  children,
  name,
  isLoading,
  variant,
}: GhostlyProps): ReactNode {
  const measurement = useGhostlyData()[name];

  if (!isLoading) {
    return <div>{children}</div>;
  }
  return (
    <GhostlySkeleton name={name} variant={variant} measurement={measurement} />
  );
}

// <GhostlySkeleton> renders the placeholder shape chosen by `variant`.
function GhostlySkeleton({
  name,
  variant,
  measurement,
}: {
  name: string;
  variant?: GhostlyVariant;
  measurement?: GhostlyMeasurement;
}): ReactNode {
  // Measured size from the provider. Without a measurement for `name`,
  // width and height stay undefined and the div keeps its natural size.
  const style = { width: measurement?.width, height: measurement?.height };

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
