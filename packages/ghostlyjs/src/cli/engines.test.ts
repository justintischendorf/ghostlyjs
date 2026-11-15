// The Node version in `engines` makes npm (and other package managers that
// read it) warn on install. It must not be lower than what a dependency
// needs (e.g. playwright-core for `ghostly measure`), or users get an
// unclear error only when running the command.
// Bun ignores `engines`; the commands also run with Bun (see the "runs
// with Bun too" tests).

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

import { expect, test } from "vitest";

type PackageJson = {
  engines?: { node?: string };
  dependencies?: Record<string, string>;
};

const own: PackageJson = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "../../package.json"), "utf8"),
);
const require = createRequire(import.meta.url);

// The major version of a simple range like ">=20" or ">=18.17".
function minimumMajor(range: string | undefined): number {
  const match = /^>=\s*(\d+)/.exec(range?.trim() ?? "");
  if (!match) throw new Error(`can't read the Node range "${range}"`);
  return Number(match[1]);
}

test("the package names the Node version it needs", () => {
  expect(own.engines?.node).toBe(">=20");
});

test.each(Object.keys(own.dependencies ?? {}))(
  "needs at least the Node version %s needs",
  (name) => {
    const dependency: PackageJson = require(`${name}/package.json`);
    if (!dependency.engines?.node) return;
    expect(minimumMajor(own.engines?.node)).toBeGreaterThanOrEqual(
      minimumMajor(dependency.engines.node),
    );
  },
);
