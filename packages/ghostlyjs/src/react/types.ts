// React-specific types of the `ghostlyjs` package.

import type { ReactNode } from "react";

// Skeleton shape, chosen by the user via the `variant` prop.
export type GhostlyVariant = "default" | "block" | "text" | "circle";

// Props for the <Ghostly> component.
export type GhostlyProps = {
  children: ReactNode;
  name: string;
  isLoading: boolean;
  variant?: GhostlyVariant;
};
