// The package's entries load with `require()` too, not only with `import`:
// Node 20.19+ and 22.12+ load ES modules that way, as long as `exports`
// offers them under `default` (not only under `import`). Runs against the
// built files, like the other tests here.

import { createRequire } from "node:module";

import { expect, test } from "vitest";

// A `require` like in a CommonJS file; the package refers to itself by name.
const require = createRequire(import.meta.url);

test.each([
  ["ghostlyjs", "Ghost"],
  ["ghostlyjs/core", "measureElement"],
])("%s loads with require()", (entry, name) => {
  expect(require(entry)).toHaveProperty(name);
});
