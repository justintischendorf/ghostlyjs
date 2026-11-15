// Colors and the logo for the output of the `ghostly` commands. The layout
// (header, lines, spinner) comes from @clack/prompts.

import { styleText } from "node:util";

import { spinner } from "@clack/prompts";

// Colors only in a terminal, and not when the user turned them off
// (https://no-color.org). So CI logs and tests get plain text. Node's own
// check (`validateStream`) only exists from Node 22.13 on.
const colors = process.stdout.isTTY === true && !process.env.NO_COLOR;

// A terminal a person watches: animations like the spinner only there. In
// CI and in a file they would leave every frame in the log.
export const interactive: boolean =
  process.stdout.isTTY === true && !process.env.CI;

type Format = Parameters<typeof styleText>[0];

export function style(format: Format, text: string): string {
  return colors ? styleText(format, text, { validateStream: false }) : text;
}

// The violet of the logo (#a78bfa). Named colors can't hit it exactly.
function violet(text: string): string {
  return colors ? `\x1b[38;2;167;139;250m${text}\x1b[39m` : text;
}

// The ghost of assets/logo.svg in half blocks (two pixels per line, 11×8):
// dome, eyes, a smile and the wavy hem.
const GHOST = [" ▄███████▄ ", "███ ███ ███", "██▄▀▀▀▀▀▄██", "██▀██▀██▀██"];

// The logo with up to four lines of text next to it.
export function logo(lines: string[]): string {
  return GHOST.map((row, index) =>
    `  ${violet(row)}   ${lines[index] ?? ""}`.trimEnd(),
  ).join("\n");
}

// The header of a command: the logo with its name and the tagline.
export function header(command: string): string {
  const text = [
    "",
    style("bold", command),
    style("dim", "Skeletons from your real UI"),
  ];
  return `\n${logo(text)}\n`;
}

// A line that shows what is going on right now (a spinner), in a terminal
// only. `hide` before printing other lines; it does nothing when hidden.
export function progressLine(): {
  show: (text: string) => void;
  hide: () => void;
} {
  // Without its own guide line: the next printed line brings one.
  const line = interactive ? spinner({ withGuide: false }) : undefined;
  let shown = false;
  return {
    show(text) {
      if (shown) line?.message(text);
      else line?.start(text);
      shown = line !== undefined;
    },
    hide() {
      if (shown) line?.clear();
      shown = false;
    },
  };
}

// A small bar, e.g. "▰▰▰▱▱▱" for 3 of 6.
export function bar(done: number, total: number): string {
  return "▰".repeat(done) + style("dim", "▱".repeat(total - done));
}

// The current time, e.g. "14:03:27", for lines that come one by one.
export function time(): string {
  return style("dim", new Date().toLocaleTimeString("en-GB"));
}
