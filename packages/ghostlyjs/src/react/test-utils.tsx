// Helpers for the React tests: render into a real page and wait for React.

import { act as reactAct, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { vi, type Mock } from "vitest";

import type { GhostBoxMeasurement } from "../core/types";

// Tells React that updates are wrapped in `act`, so it doesn't warn.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

// `act` runs an update and waits until React is done. Production React has
// no `act`; there `flushSync` renders at once (layout effects included) and
// a timeout lets pending promises finish.
async function act(callback: () => void | Promise<void>): Promise<void> {
  if (typeof reactAct === "function") {
    await reactAct(async () => {
      await callback();
    });
    return;
  }
  let pending: void | Promise<void> = undefined;
  flushSync(() => {
    pending = callback();
  });
  await pending;
  await new Promise((resolve) => setTimeout(resolve, 0));
}

export type Rendered = {
  container: HTMLDivElement;
  rerender: (ui: ReactNode) => Promise<void>;
  unmount: () => void;
};

const mounted: Root[] = [];

// Renders `ui` into a container of the given width at the top left.
export async function render(ui: ReactNode, width = 400): Promise<Rendered> {
  const container = document.createElement("div");
  container.style.cssText = `position: absolute; left: 0; top: 0; width: ${width}px`;
  document.body.append(container);
  const root = createRoot(container);
  mounted.push(root);

  const rerender = (next: ReactNode) => act(() => root.render(next));
  await rerender(ui);
  return {
    container,
    rerender,
    unmount: () => {
      root.unmount();
      container.remove();
    },
  };
}

export function cleanup(): void {
  for (const root of mounted.splice(0)) root.unmount();
  document.body.replaceChildren();
}

// A fake `ghostly dev`. `online: false` makes every request fail, like when
// nothing listens on the port.
export function mockCollector(online: boolean): Mock<() => Promise<Response>> {
  const fetch = vi.fn(async () => {
    if (!online) throw new TypeError("Failed to fetch");
    return new Response(null, { status: 204 });
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

// Lets pending promises (the collector requests) finish.
export async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

// A card 200px wide and 100px high with typical boxes.
export const card: GhostBoxMeasurement = {
  width: 200,
  height: 100,
  boxes: [
    // Wide: the card surface.
    { x: 0, y: 0, width: 200, height: 100, radius: 16 },
    // Square: an avatar.
    { x: 10, y: 10, width: 40, height: 40, radius: 20 },
    // A rotated text line.
    { x: 60, y: 20, width: 100, height: 20, radius: 4, rotate: 15 },
    // A badge that sticks out on the right.
    { x: 190, y: -5, width: 20, height: 20, radius: 10 },
  ],
};
