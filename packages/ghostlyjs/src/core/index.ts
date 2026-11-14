// Public entry of `ghostlyjs/core`: types and measuring.

import type {
  GhostBoxContent,
  GhostBoxMeasurement,
  MeasureOptions,
} from "./types";

// Default port of the `ghostly dev` collector.
export const DEFAULT_PORT = 6767;

export type {
  GhostBoxContent,
  GhostlyData,
  GhostBoxMeasurement,
  MeasureOptions,
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

// Radius of text lines and icons, which have none of their own.
const SMALL_RADIUS = 4;

// `root` is the <Ghost> wrapper. It has `display: contents` and no box of
// its own, so the frame is measured from its children.
// With `list`, the children are the items of a list: only the first one is
// measured, the skeleton repeats it.
export function measureElement(
  root: Element,
  options: MeasureOptions = {},
): GhostBoxMeasurement {
  const children = [...childNodesOf(root)];
  const items = children.filter((node) => node instanceof Element);
  const nodes = options.list ? items.slice(0, 1) : children;
  const frame = measureFrame(nodes);
  const boxes: GhostBoxContent[] = [];
  const lines: GhostBoxContent[] = [];

  // `clip` is the visible area: content of a scroll area or a clamped
  // paragraph outside of it is not drawn. Anything else may stick out of
  // the frame, like a badge on the corner of an avatar.
  function toBox(
    rect: DOMRect,
    radius: number,
    clip: DOMRect | undefined,
  ): GhostBoxContent | undefined {
    const left = clip ? Math.max(rect.left, clip.left) : rect.left;
    const top = clip ? Math.max(rect.top, clip.top) : rect.top;
    const width = (clip ? Math.min(rect.right, clip.right) : rect.right) - left;
    const height =
      (clip ? Math.min(rect.bottom, clip.bottom) : rect.bottom) - top;
    if (width <= 0 || height <= 0) return undefined;

    return {
      x: round(left - frame.left),
      y: round(top - frame.top),
      width: round(width),
      height: round(height),
      // Capped at half the shorter side, so `rounded-full` becomes a circle.
      radius: round(Math.min(radius, width / 2, height / 2)),
    };
  }

  // getClientRects: one rect for a block, one per line for inline elements.
  function addShape(
    element: Element,
    style: CSSStyleDeclaration,
    clip: DOMRect | undefined,
  ): void {
    // Icons have no radius of their own; like text they get a small one,
    // so they don't look sharper than the rest of the skeleton.
    const radius =
      parseFloat(style.borderTopLeftRadius) ||
      (element.localName === "svg" ? SMALL_RADIUS : 0);

    // Rotated or scaled: getClientRects would give the larger box around
    // it, so take the real size and store the angle instead.
    const transform = transformOf(style);
    if (transform && element instanceof HTMLElement) {
      const { a, b, c, d } = transform;
      const outer = element.getBoundingClientRect();
      const width = element.offsetWidth * Math.hypot(a, b);
      const height = element.offsetHeight * Math.hypot(c, d);
      const x = outer.left + outer.width / 2 - width / 2;
      const y = outer.top + outer.height / 2 - height / 2;
      const box = toBox(new DOMRect(x, y, width, height), radius, clip);
      const angle = round((Math.atan2(b, a) * 180) / Math.PI);
      if (box) boxes.push(angle ? { ...box, rotate: angle } : box);
      return;
    }

    for (const rect of element.getClientRects()) {
      const box = toBox(rect, radius, clip);
      if (box) boxes.push(box);
    }
  }

  function measure(nodes: Iterable<Node>, clip: DOMRect | undefined): void {
    for (const node of nodes) {
      if (node instanceof Text) {
        if (!node.textContent?.trim()) continue;
        for (const rect of rangeOf(node).getClientRects()) {
          const box = toBox(rect, SMALL_RADIUS, clip);
          if (box) lines.push(box);
        }
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
        addShape(node, style, clip);
        continue;
      }
      // Buttons, badges, cards: their surface and their content.
      if (paintsSurface(style)) {
        addShape(node, style, clip);
        // A filled circle (avatar with initials, counter badge) is drawn
        // as just the circle; a text bar inside it looks odd.
        if (isCircle(node, style)) continue;
      }
      measure(childNodesOf(node), clipOf(node, style, clip));
    }
  }

  measure(nodes, undefined);

  const first = items[0];
  return {
    width: round(frame.width),
    height: round(frame.height),
    flexShrink: first
      ? parseFloat(getComputedStyle(first).flexShrink)
      : undefined,
    align: alignmentOf(root, frame),
    boxes: [...boxes, ...mergeLines(lines)],
    // How many items the list had, for <Ghost count>.
    ...(options.list && { count: items.length }),
  };
}

// The rectangle around `nodes` (the direct children of the <Ghost>
// wrapper). Element boxes, not their content, so overflowing content
// doesn't count.
function measureFrame(nodes: Node[]): DOMRect {
  const rects = nodes
    .flatMap((node) => {
      if (node instanceof Text) return [textRect(node)];
      if (!(node instanceof Element)) return [];
      const display = getComputedStyle(node).display;
      const inside = rangeOf(node).getBoundingClientRect();
      if (display === "contents") return [inside];
      // An inline element is only as high as its text; an image inside
      // (<picture>, <a><img></a>) can be taller, so its content counts too.
      const rect = node.getBoundingClientRect();
      return display === "inline" ? [rect, inside] : [rect];
    })
    .filter((rect) => rect.width > 0 && rect.height > 0);

  if (rects.length === 0) return new DOMRect();
  const left = Math.min(...rects.map((rect) => rect.left));
  const top = Math.min(...rects.map((rect) => rect.top));
  const right = Math.max(...rects.map((rect) => rect.right));
  const bottom = Math.max(...rects.map((rect) => rect.bottom));
  return new DOMRect(left, top, right - left, bottom - top);
}

// The rect of a text node is only as high as the letters. Its lines take
// the full line height in the layout, so the frame is grown to that.
function textRect(node: Text): DOMRect {
  const range = rangeOf(node);
  const rect = range.getBoundingClientRect();
  const lineHeight = node.parentElement
    ? parseFloat(getComputedStyle(node.parentElement).lineHeight)
    : NaN;
  const extra = (range.getClientRects().length * lineHeight - rect.height) / 2;
  if (!(extra > 0)) return rect;
  return new DOMRect(
    rect.left,
    rect.top - extra,
    rect.width,
    rect.height + 2 * extra,
  );
}

// Content narrower than its parent can be centered (`mx-auto`) or pushed to
// the right (`ml-auto`). The skeleton gets the same auto margins. Only for
// block parents and flex columns: in a flex row, auto margins would change
// how the space is shared with the siblings.
function alignmentOf(
  root: Element,
  frame: DOMRect,
): "center" | "right" | undefined {
  let parent = root.parentElement;
  while (parent && getComputedStyle(parent).display === "contents") {
    parent = parent.parentElement;
  }
  if (!parent || frame.width === 0) return undefined;

  const style = getComputedStyle(parent);
  const isColumn =
    style.display.includes("flex") && style.flexDirection.startsWith("column");
  if (
    !["block", "flow-root", "list-item"].includes(style.display) &&
    !isColumn
  ) {
    return undefined;
  }

  const rect = parent.getBoundingClientRect();
  const innerLeft =
    rect.left +
    parseFloat(style.borderLeftWidth) +
    parseFloat(style.paddingLeft);
  const innerRight =
    rect.right -
    parseFloat(style.borderRightWidth) -
    parseFloat(style.paddingRight);
  const left = frame.left - innerLeft;
  const right = innerRight - frame.right;

  if (left < 1) return undefined;
  if (Math.abs(left - right) < 1) return "center";
  if (right < 1) return "right";
  return undefined;
}

// Text is split into one rect per text node: "Hello <b>world</b>" gives
// two, and so does React's `{value}%`. Pieces next to each other on the
// same line are joined into one bar.
function mergeLines(lines: GhostBoxContent[]): GhostBoxContent[] {
  const sorted = [...lines].sort((a, b) => a.y - b.y || a.x - b.x);
  const merged: GhostBoxContent[] = [];

  for (const line of sorted) {
    const last = merged.at(-1);
    if (!last || !isNextOnSameLine(last, line)) {
      merged.push({ ...line });
      continue;
    }
    const top = Math.min(last.y, line.y);
    const bottom = Math.max(last.y + last.height, line.y + line.height);
    const right = Math.max(last.x + last.width, line.x + line.width);
    last.y = top;
    last.width = round(right - last.x);
    last.height = round(bottom - top);
  }
  return merged;
}

// `b` overlaps `a` vertically by at least half and starts at most half a
// line height (about a space) after it. Overlapping pieces count too, like
// the ellipsis of `truncate`.
function isNextOnSameLine(a: GhostBoxContent, b: GhostBoxContent): boolean {
  const smaller = Math.min(a.height, b.height);
  const overlap = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  const gap = b.x - (a.x + a.width);
  return overlap >= smaller / 2 && gap <= smaller / 2;
}

// The combined transform of an element, or undefined if it has none.
// Tailwind v4 uses the separate `rotate` and `scale` properties.
function transformOf(style: CSSStyleDeclaration): DOMMatrix | undefined {
  if (
    style.transform === "none" &&
    style.rotate === "none" &&
    style.scale === "none"
  ) {
    return undefined;
  }
  let matrix = new DOMMatrix(style.transform === "none" ? "" : style.transform);
  if (style.rotate !== "none") {
    // "45deg", or with an axis first: "z 45deg".
    matrix = matrix.rotate(parseFloat(style.rotate.split(" ").at(-1) ?? ""));
  }
  if (style.scale !== "none") {
    const [x = 1, y = x] = style.scale.split(" ").map(parseFloat);
    matrix = matrix.scale(x, y);
  }
  return matrix;
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

// The visible area for the children of `element`: its inside (without
// borders) if it hides overflow (scroll areas, `truncate`, `line-clamp`).
function clipOf(
  element: Element,
  style: CSSStyleDeclaration,
  clip: DOMRect | undefined,
): DOMRect | undefined {
  if (style.overflowX === "visible" && style.overflowY === "visible") {
    return clip;
  }
  const rect = element.getBoundingClientRect();
  const left = Math.max(
    rect.left + parseFloat(style.borderLeftWidth),
    clip?.left ?? -Infinity,
  );
  const top = Math.max(
    rect.top + parseFloat(style.borderTopWidth),
    clip?.top ?? -Infinity,
  );
  const right = Math.min(
    rect.right - parseFloat(style.borderRightWidth),
    clip?.right ?? Infinity,
  );
  const bottom = Math.min(
    rect.bottom - parseFloat(style.borderBottomWidth),
    clip?.bottom ?? Infinity,
  );
  return new DOMRect(left, top, right - left, bottom - top);
}

// True if the element paints something itself. Only used to decide whether
// it gets a box; the color is not stored.
function paintsSurface(style: CSSStyleDeclaration): boolean {
  return (
    !isTransparent(style.backgroundColor) ||
    style.backgroundImage !== "none" ||
    style.boxShadow !== "none" ||
    // A border on all sides outlines a card. A single side is just a
    // divider line (`divide-y`, table rows), not a surface.
    [
      style.borderTopWidth,
      style.borderRightWidth,
      style.borderBottomWidth,
      style.borderLeftWidth,
    ].every((width) => parseFloat(width) > 0)
  );
}

// Round (`rounded-full`) and about as wide as high.
function isCircle(element: Element, style: CSSStyleDeclaration): boolean {
  const { width, height } = element.getBoundingClientRect();
  const ratio = width / height;
  return (
    ratio > 0.8 &&
    ratio < 1.25 &&
    parseFloat(style.borderTopLeftRadius) >= Math.min(width, height) / 2 - 1
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
