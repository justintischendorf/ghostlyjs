// React-specific types of the `ghostlyjs` package.

import type { ReactNode } from "react";

import type { GhostlyData } from "../core/types";

// Skeleton shape, chosen by the user via the `variant` prop.
export type GhostlyVariant = "default" | "block" | "text" | "circle";

// Props for the <Ghostly> component.
export type GhostlyProps = {
  // The real content, shown once loading is done.
  children: ReactNode;
  // Unique key; the measurement is stored and looked up under this name.
  name: string;
  // Shows the skeleton while true.
  isLoading: boolean;
  // Skeleton shape; falls back to "default".
  variant?: GhostlyVariant;
};

// Props for the <GhostlyProvider> component.
export type GhostlyProviderProps = {
  // Measured skeletons, usually imported from the generated `ghostly.json`.
  data: GhostlyData;
  children: ReactNode;
};
