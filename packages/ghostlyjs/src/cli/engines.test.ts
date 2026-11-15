// The Node version in `engines` makes npm (and other package managers that
// read it) warn on install. It must not be lower than what a dependency
// needs (e.g. @clack/prompts for the output of the commands), or users get an
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

// The minimum of a simple range like ">=20" or ">=20.12.0", as
// [major, minor]. The minor counts: a dependency may need e.g. 20.12.
function minimum(range: string | undefined): Version {
  const match = /^>=\s*(\d+)(?:\.(\d+))?/.exec(range?.trim() ?? "");
  if (!match) throw new Error(`can't read the Node range "${range}"`);
  return [Number(match[1]), Number(match[2] ?? 0)];
}

// Whether version `a` is at least `b`.
type Version = [major: number, minor: number];
const atLeast = ([major, minor]: Version, [major2, minor2]: Version) =>
  major > major2 || (major === major2 && minor >= minor2);

test("the package names the Node version it needs", () => {
  expect(own.engines?.node).toBe(">=20.12");
});

test("reads the minor version too", () => {
  expect(minimum(">=20")).toEqual([20, 0]);
  expect(minimum(">= 20.12.0")).toEqual([20, 12]);
  expect(atLeast([20, 0], [20, 12])).toBe(false);
});

test.each(Object.keys(own.dependencies ?? {}))(
  "needs at least the Node version %s needs",
  (name) => {
    const dependency: PackageJson = require(`${name}/package.json`);
    if (!dependency.engines?.node) return;
    const needed = dependency.engines.node;
    expect(
      atLeast(minimum(own.engines?.node), minimum(needed)),
      `${name} needs Node ${needed}`,
    ).toBe(true);
  },
);
