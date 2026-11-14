import type { ReactNode } from "react";

import type { GhostlyProps, GhostlyVariant } from "./types";

// The <Ghostly> component renders its children if `isLoading` is false, otherwise it renders a skeleton placeholder.
export function Ghostly({
  children,
  name,
  isLoading,
  variant,
}: GhostlyProps): ReactNode {
  if (!isLoading) {
    return <div>{children}</div>;
  }
  return <GhostlySkeleton name={name} variant={variant} />;
}

// The <GhostlySkeleton> component renders a skeleton placeholder based on the `variant` prop.
function GhostlySkeleton({
  name,
  variant,
}: {
  name: string;
  variant?: GhostlyVariant;
}): ReactNode {
  switch (variant) {
    // A block skeleton is a rectangular placeholder that represents a block of content.
    case "block":
      return <div>{`Block skeleton for ${name}`}</div>;
    // A text skeleton is a line placeholder that represents a line of text.
    case "text":
      return <div>{`Text skeleton for ${name}`}</div>;
    // A circle skeleton is a circular placeholder that represents an avatar or a profile picture.
    case "circle":
      return <div>{`Circle skeleton for ${name}`}</div>;
    // The default skeleton is a generic placeholder that represents any content.
    default:
      return <div>{`Default skeleton for ${name}`}</div>;
  }
}
