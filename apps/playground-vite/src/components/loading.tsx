"use client";

import { isMeasuring } from "ghostlyjs";
import { CircleCheck, LoaderCircle } from "lucide-react";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

// One loading state for the whole playground, so the toggle in the nav
// switches every page between content and skeletons. Also the ones in an
// open dialog, menu or drawer.
const LoadingContext = createContext({
  isLoading: true,
  toggle: () => {},
});

declare global {
  interface Window {
    // For the e2e tests: switches while a dialog covers the toggle.
    playground?: { setLoading: (isLoading: boolean) => void };
  }
}

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const toggle = () => setIsLoading((value) => !value);
  // `ghostly measure` would find the content by tapping the toggle too;
  // showing it right away is faster.
  // In an effect, because the server doesn't know and renders skeletons.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see above
    if (isMeasuring()) setIsLoading(false);
    window.playground = { setLoading: setIsLoading };
    return () => {
      delete window.playground;
    };
  }, []);
  return (
    <LoadingContext.Provider value={{ isLoading, toggle }}>
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  return useContext(LoadingContext);
}

export function LoadingToggle() {
  const { isLoading, toggle } = useLoading();
  const label = isLoading ? "Show content" : "Show skeletons";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm hover:bg-card"
    >
      {isLoading ? (
        <LoaderCircle className="size-4 animate-spin" />
      ) : (
        <CircleCheck className="size-4" />
      )}
      <span className="hidden sm:inline">
        {isLoading ? "Loading" : "Loaded"}
      </span>
    </button>
  );
}
