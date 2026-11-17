import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

import {
  isMeasuring,
  MEASURE_ALL,
  measureElement,
  parentWidthOf,
  type GhostMeasureResult,
} from "../core";
import { keyAt, variantClasses, variantsOf } from "../core/breakpoints";
import type {
  Calc,
  GhostBoxContent,
  GhostBoxMeasurement,
  GhostlyEntry,
} from "../core/types";
import { useGhostly } from "./ghostly-provider";
import type { GhostProps } from "./types";

// <Ghost> renders its children when `isLoading` is false, otherwise a
// skeleton built from the measurement stored under its `name`.
export function Ghost({
  children,
  name,
  isLoading,
  count,
}: GhostProps): ReactNode {
  const { data, breakpoints } = useGhostly();
  const isList = count !== undefined;
  // Fresh measurements of this page load, keyed like `ghostly.json`.
  const [measured, setMeasured] = useState<GhostlyEntry>({});
  const ref = useRef<HTMLDivElement>(null);

  // Dev only: measure the real content after React rendered it and before
  // the browser paints, so the layout is final. The skeleton uses it when
  // the content loads again, at the width it was measured at.
  useLayoutEffect(() => {
    if (isLoading || !ref.current) return;
    if (process.env.NODE_ENV !== "development") return;

    const element = ref.current;
    const measure = () => {
      const measurement = measureElement(element, { list: isList });
      // `innerWidth` includes the scrollbar, like the width media queries see.
      const key = keyAt(window.innerWidth, data[name], breakpoints);
      setMeasured((previous) => ({ ...previous, [key]: measurement }));
    };
    measure();
    // A web font can arrive after the content showed. Text measured with the
    // fallback font has other sizes, so measure again once it is there.
    document.fonts?.addEventListener("loadingdone", measure);
    // `ghostly measure` measures the shown <Ghost>s itself, at every width.
    const unregister = isMeasuring()
      ? register(element, name, isList)
      : undefined;
    return () => {
      document.fonts?.removeEventListener("loadingdone", measure);
      unregister?.();
    };
  }, [isLoading, name, isList, breakpoints, data]);

  if (!isLoading) {
    // `display: contents` keeps the parent's flex/grid layout intact.
    // `data-ghost` shows in the browser's dev tools which <Ghost> it is.
    return (
      <div ref={ref} data-ghost={name} style={{ display: "contents" }}>
        {children}
      </div>
    );
  }
  // Fresh measurements win over the stored ones from the provider.
  const entry = { ...data[name], ...measured };
  const variants = variantsOf(entry, breakpoints);
  // Never measured: no variant, one placeholder (per list item).
  if (variants.length === 0) {
    return repeat(isList ? count : 1, undefined, (key) => (
      <GhostSkeleton key={key} name={name} />
    ));
  }

  // One skeleton per variant, each hidden by CSS outside its widths.
  // A list: one skeleton per item, side by side in the list's container, so
  // its gap and grid place them like the real items.
  return variants.flatMap((variant) =>
    repeat(isList ? count : 1, variant.measurement, (key) => (
      <GhostSkeleton
        key={`${variant.from}-${key}`}
        name={name}
        measurement={variant.measurement}
        className={variantClasses(variant)}
      />
    )),
  );
}

// Renders `count` items: a number, or `true` for as many as measured. At
// least one, so an empty list when measured still shows that something
// loads.
function repeat(
  count: number | true | undefined,
  measurement: GhostBoxMeasurement | undefined,
  render: (key: number) => ReactNode,
): ReactNode[] {
  const times = count === true ? (measurement?.count ?? 1) : (count ?? 1);
  return Array.from({ length: Math.max(1, times) }, (_, key) => render(key));
}

// The shown <Ghost>s, for `ghostly measure`.
const shown = new Map<Element, { name: string; list: boolean }>();

// Adds a shown <Ghost> to the ones `window.__ghostlyMeasureAll` measures;
// returns the function that removes it again.
function register(element: Element, name: string, list: boolean): () => void {
  shown.set(element, { name, list });
  Object.assign(window, {
    [MEASURE_ALL]: (names?: string[]): GhostMeasureResult[] =>
      [...shown]
        .filter(([, ghost]) => !names || names.includes(ghost.name))
        .map(([root, ghost]) => ({
          name: ghost.name,
          measurement: measureElement(root, { list: ghost.list }),
          parentWidth: parentWidthOf(root),
        })),
  });
  return () => shown.delete(element);
}

// `calc(px + percent)` in a unit for the percent: `%` of the parent's
// width, or `cqw` of the skeleton's width (a container, see below).
function css([px = 0, percent = 0]: Calc, unit: "%" | "cqw" = "%"): string {
  return percent === 0 ? `${px}px` : `calc(${px}px + ${percent}${unit})`;
}

// A box of a `fluid` measurement: `ghostly measure` saw how it changes
// with the width of the frame, so it is placed exactly like that.
function fluidBox(box: GhostBoxContent): {
  left: string | number;
  top: string | number;
  width: string | number;
  height: string | number;
} {
  return {
    left: box.xCalc ? css(box.xCalc, "cqw") : box.x,
    top: box.yCalc ? css(box.yCalc, "cqw") : box.y,
    width: box.widthCalc ? css(box.widthCalc, "cqw") : box.width,
    height: box.heightCalc ? css(box.heightCalc, "cqw") : box.height,
  };
}

// A box measured at one width only: it stretches with the frame, unless it
// is a circle or a small square-ish box.
function stretchedBox(
  box: GhostBoxContent,
  frameWidth: number,
): {
  left: string;
  top: number;
  width: string | number;
  height: number;
  maxWidth?: string;
} {
  const percent = (px: number) => `${(px / frameWidth) * 100}%`;
  return {
    left: percent(box.x),
    top: box.y,
    height: box.height,
    // Circles (avatars) and small square-ish boxes (icons) keep their
    // size, so they stay round and square, but never reach past the
    // frame's right edge. All others stretch with the frame: text lines,
    // and cards too, so a card still holds its stretched content. Boxes
    // that already stuck out when measured (a badge on a corner) stay as
    // they are.
    width: keepsSize(box) ? box.width : percent(box.width),
    maxWidth:
      box.x + box.width <= frameWidth ? percent(frameWidth - box.x) : undefined,
  };
}

// Icons, avatars and other boxes that don't change with the width: neither
// side more than 1.5 times the other, and a circle or small.
const SMALL_BOX = 64;
function keepsSize({ width, height, radius }: GhostBoxContent): boolean {
  const squarish = width <= height * 1.5 && height <= width * 1.5;
  const circle = radius >= Math.min(width, height) / 2;
  return squarish && (circle || Math.max(width, height) <= SMALL_BOX);
}

function GhostSkeleton({
  name,
  measurement,
  className = "",
}: {
  name: string;
  measurement?: GhostBoxMeasurement;
  // Hides it outside its breakpoints.
  className?: string;
}): ReactNode {
  // Never measured yet: one bar, so the user still sees that something
  // loads. It is replaced once the real content was shown in dev.
  if (!measurement) {
    return <div className="ghostly-placeholder" data-ghost={name} />;
  }
  const { width } = measurement;

  return (
    // `ghostly measure` stores how the content's width follows its parent
    // (`widthCalc`, e.g. `calc(-120px + 100%)` for a `flex-1` next to a
    // sidebar). Without it: content that filled its parent fills it again,
    // also a wider one (a wider phone). Other content keeps the measured width, as a real width
    // and not `100%`: a parent sized by its content (`w-auto`, a flex row)
    // then makes room for it like for the content, instead of getting
    // narrower and wrapping. `max-width` shrinks it with a narrower parent
    // instead of overlapping its neighbour. In a flex row it doesn't grow
    // (`flex-1` would split the row evenly, the real content takes as much
    // as it needs), so its neighbours get the rest.
    <div
      className={`ghostly-skeleton ${className}`.trim()}
      data-ghost={name}
      style={{
        width: measurement.widthCalc
          ? css(measurement.widthCalc)
          : measurement.fill
            ? "100%"
            : width,
        maxWidth: "100%",
        // A container, so the boxes can follow its width (`cqw`), also in
        // height. Its own height then comes from the spacer below.
        containerType: measurement.fluid ? "inline-size" : undefined,
        height: measurement.heightCalc ? undefined : measurement.height,
        flex: `0 ${measurement.flexShrink ?? 1} auto`,
        // Same auto margins as the content (`mx-auto`, `ml-auto`).
        marginLeft: measurement.align ? "auto" : undefined,
        marginRight: measurement.align === "center" ? "auto" : undefined,
      }}
    >
      {measurement.boxes.map((box, index) => (
        <div
          key={index}
          className="ghostly-box"
          style={{
            ...(measurement.fluid ? fluidBox(box) : stretchedBox(box, width)),
            borderRadius: box.radius,
            transform: box.rotate ? `rotate(${box.rotate}deg)` : undefined,
          }}
        />
      ))}
      {measurement.heightCalc && (
        <div style={{ height: css(measurement.heightCalc, "cqw") }} />
      )}
    </div>
  );
}
