// Public entry of `ghostlyjs/core`: types, measuring and generating.

import type { GhostBoxContent, GhostBoxMeasurement } from "./types";

// Default port of the `ghostly dev` collector.
export const DEFAULT_PORT = 6767;

export type {
  GhostBoxContent,
  GhostlyData,
  GhostBoxMeasurement,
} from "./types";

// Elements measured as one box. Their insides (paths, <source>, <option>,
// the text of a <textarea>) are not shapes of their own.
const MEDIA = new Set([
  "img",
  "svg",
  "video",
  "audio",
  "canvas",
  "iframe",
  "object",
  "embed",
  "input",
  "textarea",
  "select",
  "progress",
  "meter",
]);

// `root` is the <Ghost> wrapper. It has `display: contents` and no box of
// its own, so the frame is measured from its children.
export function measureElement(root: Element): GhostBoxMeasurement {
  const frame = measureFrame(root);
  const boxes: GhostBoxContent[] = [];

  function addBox(rect: DOMRect, radius: number): void {
    // Clipped to the frame, so overflowing content (scroll areas,
    // carousels) doesn't make the skeleton bigger than the real UI.
    const left = Math.max(rect.left, frame.left);
    const top = Math.max(rect.top, frame.top);
    const width = Math.min(rect.right, frame.right) - left;
    const height = Math.min(rect.bottom, frame.bottom) - top;
    if (width <= 0 || height <= 0) return;

    boxes.push({
      x: round(left - frame.left),
      y: round(top - frame.top),
      width: round(width),
      height: round(height),
      // Capped at half the shorter side, so `rounded-full` becomes a circle.
      radius: round(Math.min(radius, width / 2, height / 2)),
    });
  }

  // getClientRects: one rect for a block, one per line for inline elements.
  function addShape(element: Element, style: CSSStyleDeclaration): void {
    const radius = parseFloat(style.borderTopLeftRadius) || 0;
    for (const rect of element.getClientRects()) addBox(rect, radius);
  }

  function measure(parent: Node): void {
    for (const node of childNodesOf(parent)) {
      if (node instanceof Text) {
        if (!node.textContent?.trim()) continue;
        for (const rect of rangeOf(node).getClientRects()) addBox(rect, 4);
        continue;
      }
      if (!(node instanceof Element)) continue;

      const style = getComputedStyle(node);
      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        style.opacity === "0"
      ) {
        continue;
      }
      if (MEDIA.has(node.localName)) {
        addShape(node, style);
        continue;
      }
      // Buttons, badges, cards: their surface and their content.
      if (paintsSurface(style)) addShape(node, style);
      measure(node);
    }
  }

  measure(root);

  const content = root.firstElementChild;
  return {
    width: round(frame.width),
    height: round(frame.height),
    flexShrink: content
      ? parseFloat(getComputedStyle(content).flexShrink)
      : undefined,
    boxes,
  };
}

// The rectangle around all direct children of `root`. Element boxes, not
// their content, so overflowing content doesn't count.
function measureFrame(root: Element): DOMRect {
  const rects = [...childNodesOf(root)]
    .map((node) =>
      node instanceof Element && getComputedStyle(node).display !== "contents"
        ? node.getBoundingClientRect()
        : rangeOf(node).getBoundingClientRect(),
    )
    .filter((rect) => rect.width > 0 && rect.height > 0);

  if (rects.length === 0) return new DOMRect();
  const left = Math.min(...rects.map((rect) => rect.left));
  const top = Math.min(...rects.map((rect) => rect.top));
  const right = Math.max(...rects.map((rect) => rect.right));
  const bottom = Math.max(...rects.map((rect) => rect.bottom));
  return new DOMRect(left, top, right - left, bottom - top);
}

// The nodes that are actually rendered inside `node`: for web components
// the open shadow root, for a <slot> the content passed into it.
function childNodesOf(node: Node): Iterable<Node> {
  if (node instanceof Element && node.shadowRoot) {
    return node.shadowRoot.childNodes;
  }
  if (node instanceof HTMLSlotElement) {
    const assigned = node.assignedNodes({ flatten: true });
    return assigned.length > 0 ? assigned : node.childNodes;
  }
  return node.childNodes;
}

// True if the element paints something itself. Only used to decide whether
// it gets a box; the color is not stored.
function paintsSurface(style: CSSStyleDeclaration): boolean {
  return (
    !isTransparent(style.backgroundColor) ||
    style.backgroundImage !== "none" ||
    style.boxShadow !== "none" ||
    [
      style.borderTopWidth,
      style.borderRightWidth,
      style.borderBottomWidth,
      style.borderLeftWidth,
    ].some((width) => parseFloat(width) > 0)
  );
}

// `transparent`, `rgba(…, 0)` or a modern color with `/ 0` alpha (oklch).
// Only `rgba(` has an alpha as 4th value; in `rgb(255, 0, 0)` the 0 is blue.
function isTransparent(color: string): boolean {
  return (
    color === "transparent" ||
    /^rgba\(.*,\s*0\)$/.test(color) ||
    /\/\s*0\)$/.test(color)
  );
}

function rangeOf(node: Node): Range {
  const range = document.createRange();
  range.selectNodeContents(node);
  return range;
}

// One decimal is precise enough and keeps `ghostly.json` short.
function round(value: number): number {
  return Math.round(value * 10) / 10;
}
