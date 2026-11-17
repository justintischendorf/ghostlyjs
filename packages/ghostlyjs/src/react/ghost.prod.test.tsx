// Tests for <Ghost> in production (`NODE_ENV` is "production", see
// vitest.config.ts): it must never measure anything.

import { afterEach, expect, test, vi } from "vitest";

import { Ghost, GhostlyProvider } from "./index";
import {
  card,
  cleanup,
  everywhere,
  measureAll,
  measuring,
  render,
} from "./test-utils";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const content = <div style={{ width: 300, height: 50 }}>Content</div>;

// `ghostly measure` stops right away when this mark is missing.
test("the provider doesn't mark dev mode", async () => {
  const { container } = await render(
    <GhostlyProvider data={{}}>{null}</GhostlyProvider>,
  );
  const style = container.querySelector("style[data-ghostly-breakpoints]");
  expect(style?.hasAttribute("data-ghostly-dev")).toBe(false);
});

test("can't be measured, not even by `ghostly measure`", async () => {
  measuring();
  await render(
    <Ghost name="a" isLoading={false}>
      {content}
    </Ghost>,
  );
  expect(measureAll()).toEqual([]);
});

test("keeps the stored measurement after the content was shown", async () => {
  const ui = (isLoading: boolean) => (
    <GhostlyProvider data={{ card: everywhere(card) }}>
      <Ghost name="card" isLoading={isLoading}>
        {content}
      </Ghost>
    </GhostlyProvider>
  );
  const { container, rerender } = await render(ui(false));
  await rerender(ui(true));

  const skeleton = container.querySelector(".ghostly-skeleton");
  expect(skeleton?.getBoundingClientRect()).toMatchObject({
    width: 200,
    height: 100,
  });
});
