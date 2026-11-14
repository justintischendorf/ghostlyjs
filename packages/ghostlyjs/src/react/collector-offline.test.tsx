// <Ghost> without a running `ghostly dev`. A file of its own: <Ghost>
// remembers per page load whether the collector answered, and each test
// file runs in a fresh page (see ghost.test.tsx).

import { afterEach, expect, test, vi } from "vitest";

import { Ghost } from "./index";
import { cleanup, flush, mockCollector, render } from "./test-utils";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test("only one request fails per page load, not one per Ghost", async () => {
  const fetch = mockCollector(false);
  const { container } = await render(
    <>
      {["a", "b", "c"].map((name) => (
        <Ghost key={name} name={name} isLoading={false}>
          <div style={{ width: 100, height: 20 }}>{name}</div>
        </Ghost>
      ))}
    </>,
  );
  await flush();

  expect(fetch).toHaveBeenCalledTimes(1);
  // The content is shown anyway.
  expect(container.textContent).toBe("abc");
});
