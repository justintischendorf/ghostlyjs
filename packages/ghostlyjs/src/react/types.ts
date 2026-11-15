// React-specific types of the `ghostlyjs` package.

import type { ReactNode } from "react";

import type { Breakpoints, GhostlyData } from "../core/types";

// Props for the <Ghost> component.
export type GhostProps = {
  // The real content, shown once loading is done.
  children: ReactNode;
  // Unique key; the measurement is stored and looked up under this name.
  name: string;
  // Shows the skeleton while true.
  isLoading: boolean;
  // For lists: the children are the items. Only the first item is measured,
  // and the skeleton shows it `count` times. `true` (just `count`) shows as
  // many as there were when measured. Put the <Ghost> inside the list's
  // container, so its gap and grid apply to the skeletons too.
  count?: number | true;
};

// Props for the <GhostlyProvider> component.
export type GhostlyProviderProps = {
  // Measured skeletons, usually imported from the generated `ghostly.json`.
  data: GhostlyData;
  // Window widths where the layout changes, e.g. `{ sm: 640, md: 768 }`.
  // A <Ghost> is measured per range and its skeleton switches with CSS at
  // these widths, so they should match your CSS. Default: Tailwind's.
  breakpoints?: Breakpoints;
  children: ReactNode;
};
