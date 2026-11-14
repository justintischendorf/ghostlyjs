// <GhostlyProvider> passes the measured skeleton data down to every <Ghostly>.

import { createContext, useContext, type ReactNode } from "react";

import type { GhostlyData } from "../core/types";
import type { GhostlyProviderProps } from "./types";

// Empty by default, so <Ghostly> also works without a provider.
const GhostlyContext = createContext<GhostlyData>({});

// Wrap the app once and pass the generated data (e.g. `ghostly.json`).
// `.Provider` instead of `<Context value>` keeps React 18 support.
export function GhostlyProvider({
  data,
  children,
}: GhostlyProviderProps): ReactNode {
  return (
    <GhostlyContext.Provider value={data}>{children}</GhostlyContext.Provider>
  );
}

// Used by <Ghostly> to read its measurement.
export function useGhostlyData(): GhostlyData {
  return useContext(GhostlyContext);
}
