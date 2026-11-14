// Public entry of `ghostlyjs/core`: types, measuring and generating.

// Default port of the `ghostly dev` collector.
export const DEFAULT_PORT = 6767;

// Measure the position and size of an HTML element.
// Position (x/y) is relative to the viewport and changes on scroll.
export function measureElement(element: HTMLElement): DOMRect {
  return element.getBoundingClientRect();
}
