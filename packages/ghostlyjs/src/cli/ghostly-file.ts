// Reading and writing `ghostly.json`, shared by `ghostly dev` and
// `ghostly measure`.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import type { GhostlyData } from "../core/types";

// Next to the app's package.json, where the command runs.
export function ghostlyFile(): string {
  return resolve(process.cwd(), "ghostly.json");
}

export function readGhostlyFile(file: string): GhostlyData {
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
}

// Sorted by name, so the file only changes where values change.
export function writeGhostlyFile(file: string, data: GhostlyData): void {
  writeFileSync(file, `${JSON.stringify(sortByKey(data), null, 2)}\n`);
}

export function sortByKey<T>(object: Record<string, T>): Record<string, T> {
  return Object.fromEntries(Object.entries(object).sort());
}

// Whether a value sent by a page is a measurement: `{name, breakpoint,
// measurement}` with a box list.
export function isMeasurementMessage(value: unknown): value is {
  name: string;
  breakpoint: string;
  measurement: GhostlyData[string][string];
} {
  const message = value as Record<string, unknown> | null;
  return (
    typeof message?.name === "string" &&
    typeof message.breakpoint === "string" &&
    message.breakpoint !== "" &&
    Array.isArray((message.measurement as { boxes?: unknown })?.boxes)
  );
}
