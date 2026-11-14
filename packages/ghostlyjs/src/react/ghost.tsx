import { useLayoutEffect, useRef, type ReactNode } from "react";

import { measureElement } from "../core";
import type { GhostBoxMeasurement } from "../core/types";
import { useGhostlyData } from "./ghostly-provider";
import type { GhostProps } from "./types";

// <Ghost> renders its children when `isLoading` is false, otherwise a
// skeleton sized by the measurement stored under its `name`.
export function Ghost({ children, name, isLoading }: GhostProps): ReactNode {
  const measurement = useGhostlyData()[name];
  const ref = useRef<HTMLDivElement>(null);

  // Measure the real content once it is rendered. Runs after React updated
  // the DOM and before the browser paints, so the layout is final.
  // Dev only: production never measures.
  useLayoutEffect(() => {
    const element = ref.current;
    if (isLoading || !element) return;
    if (process.env.NODE_ENV !== "development") return;

    // For now only logged; sending to `ghostly dev` comes next.
    const measure = (): void => {
      console.log(`[ghostly] ${name}`, measureElement(element));
    };
    measure();

    // Images and videos without a fixed size are 0px until loaded, so
    // measure again then. `load` doesn't bubble; capture (`true`) catches it.
    element.addEventListener("load", measure, true);
    element.addEventListener("loadedmetadata", measure, true);
    return () => {
      element.removeEventListener("load", measure, true);
      element.removeEventListener("loadedmetadata", measure, true);
    };
  }, [isLoading, name]);

  if (!isLoading) {
    // `display: contents` removes the wrapper from the layout, so the
    // children keep the parent's flex/grid context and percentage sizes.
    return (
      <div ref={ref} style={{ display: "contents" }}>
        {children}
      </div>
    );
  }
  return <GhostSkeleton name={name} measurement={measurement} />;
}

// <GhostSkeleton> renders the placeholder for one measured <Ghost>.
function GhostSkeleton({
  name,
  measurement,
}: {
  name: string;
  measurement?: GhostBoxMeasurement;
}): ReactNode {
  // Measured size from the provider. `flexShrink: 0` keeps that size in a
  // flex row. Without a measurement for `name`, the div keeps its natural size.
  const style = measurement
    ? { width: measurement.width, height: measurement.height, flexShrink: 0 }
    : undefined;

  return <div style={style}>{`Skeleton for ${name}`}</div>;
}
