import { isMeasuring } from "ghostlyjs";
import { LoaderCircle, CircleCheck } from "lucide-react";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

// One loading state for the whole playground, so the toggle in the nav
// switches every page between content and skeletons.
const LoadingContext = createContext({
  isLoading: true,
  toggle: () => {},
});

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const toggle = () => setIsLoading((value) => !value);
  // `ghostly measure` can't click the toggle: show the content right away.
  // In an effect, because the server doesn't know and renders skeletons.
  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- see above
    if (isMeasuring()) setIsLoading(false);
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
      {isLoading ? "Loading" : "Loaded"}
    </button>
  );
}
