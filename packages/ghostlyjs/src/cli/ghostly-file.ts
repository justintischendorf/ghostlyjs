// Reading and writing `ghostly.json` for `ghostly measure`.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";

import type { GhostlyData } from "../core/types";
import { CliError } from "./cli-error";

// Next to the app's package.json, where the command runs.
export function ghostlyFile(): string {
  return resolve(process.cwd(), "ghostly.json");
}

// A broken file (e.g. merge conflict markers) is an error the user can
// fix, not a crash; overwriting it would lose the measurements in it.
export function readGhostlyFile(file: string): GhostlyData {
  if (!existsSync(file)) return {};
  const broken = new CliError(
    `${relative(process.cwd(), file)} is broken, e.g. by a merge conflict.\n` +
      "Fix it, or delete it to measure everything again.",
  );
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    throw broken;
  }
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw broken;
  }
  return data as GhostlyData;
}

// Sorted by name, so the file only changes where values change.
export function writeGhostlyFile(file: string, data: GhostlyData): void {
  writeFileSync(file, `${JSON.stringify(sortByKey(data), null, 2)}\n`);
}

export function sortByKey<T>(object: Record<string, T>): Record<string, T> {
  return Object.fromEntries(Object.entries(object).sort());
}
