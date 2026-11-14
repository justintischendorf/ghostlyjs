// React-specific types of the `ghostlyjs` package.

import type { ReactNode } from "react";

import type { GhostlyData } from "../core/types";

// Props for the <Ghost> component.
export type GhostProps = {
  // The real content, shown once loading is done.
  children: ReactNode;
  // Unique key; the measurement is stored and looked up under this name.
  name: string;
  // Shows the skeleton while true.
  isLoading: boolean;
};

// Props for the <GhostlyProvider> component.
export type GhostlyProviderProps = {
  // Measured skeletons, usually imported from the generated `ghostly.json`.
  data: GhostlyData;
  children: ReactNode;
};
