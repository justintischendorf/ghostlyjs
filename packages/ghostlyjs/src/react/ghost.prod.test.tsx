// Tests for <Ghost> in production (`NODE_ENV` is "production", see
// vitest.config.ts): it must never measure or send anything.

import { afterEach, expect, test, vi } from "vitest";

import { Ghost, GhostlyProvider } from "./index";
import {
  card,
  cleanup,
  everywhere,
  flush,
  mockCollector,
  render,
} from "./test-utils";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const content = <div style={{ width: 300, height: 50 }}>Content</div>;

test("doesn't send measurements", async () => {
  const fetch = mockCollector(true);
  await render(
    <Ghost name="a" isLoading={false}>
      {content}
    </Ghost>,
  );
  await flush();
  expect(fetch).not.toHaveBeenCalled();
});

test("keeps the stored measurement after the content was shown", async () => {
  mockCollector(true);
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
