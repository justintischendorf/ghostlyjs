// Reading and writing `ghostly.json` for `ghostly measure`.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import type { GhostlyData } from "../core/types";

// Next to the app's package.json, where the command runs.
export function ghostlyFile(): string {
  return resolve(process.cwd(), "ghostly.json");
}

// The ghostly.json before, only to report which ghosts are gone. Every
// run writes the file anew, so a broken one (e.g. merge conflict markers)
// is simply replaced.
export function readOldGhostlyFile(file: string): GhostlyData {
  if (!existsSync(file)) return {};
  try {
    const data: unknown = JSON.parse(readFileSync(file, "utf8"));
    if (typeof data === "object" && data !== null && !Array.isArray(data)) {
      return data as GhostlyData;
    }
  } catch {
    // Broken: nothing to compare with.
  }
  return {};
}

// Sorted by name and breakpoint, so the file only changes where values
// change.
export function writeGhostlyFile(file: string, data: GhostlyData): void {
  const sorted = sortByKey(
    Object.fromEntries(
      Object.entries(data).map(([name, entry]) => [name, sortByKey(entry)]),
    ),
  );
  writeFileSync(file, `${JSON.stringify(sorted, null, 2)}\n`);
}

function sortByKey<T>(object: Record<string, T>): Record<string, T> {
  return Object.fromEntries(Object.entries(object).sort());
}
