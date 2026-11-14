// <GhostlyProvider> passes the measured skeleton data down to every <Ghost>.

import { createContext, useContext, useMemo, type ReactNode } from "react";

import { breakpointCss, DEFAULT_BREAKPOINTS } from "../core/breakpoints";
import type { Breakpoints, GhostlyData } from "../core/types";
import { css } from "./ghost-styles";
import type { GhostlyProviderProps } from "./types";

type GhostlyContextValue = { data: GhostlyData; breakpoints: Breakpoints };

// Empty by default, so <Ghost> also works without a provider.
const GhostlyContext = createContext<GhostlyContextValue>({
  data: {},
  breakpoints: DEFAULT_BREAKPOINTS,
});

// Wrap the app once and pass the generated data (e.g. `ghostly.json`).
// `.Provider` instead of `<Context value>` keeps React 18 support.
// It also adds the skeleton styles once, so users don't import a CSS file,
// including the media queries that pick the variant for each breakpoint.
export function GhostlyProvider({
  data,
  breakpoints = DEFAULT_BREAKPOINTS,
  children,
}: GhostlyProviderProps): ReactNode {
  const value = useMemo(() => ({ data, breakpoints }), [data, breakpoints]);
  return (
    <GhostlyContext.Provider value={value}>
      <style>{`${css}\n${breakpointCss(breakpoints)}`}</style>
      {children}
    </GhostlyContext.Provider>
  );
}

// Used by <Ghost> to read its measurements and the breakpoints.
export function useGhostly(): GhostlyContextValue {
  return useContext(GhostlyContext);
}
