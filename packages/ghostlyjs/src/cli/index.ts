// Entry of the `ghostly` command. The build adds the Node shebang.

import { createRequire } from "node:module";

import { log, outro } from "@clack/prompts";

import { CliError } from "./cli-error";
import { runMeasure } from "./measure";
import { header, style } from "./style";

// The package's own package.json: two folders up from src/cli and from
// dist/cli alike.
const { version } = createRequire(import.meta.url)("../../package.json") as {
  version: string;
};

const USAGE = `${style("bold", "Usage")}
  ghostly measure <url>    measure every page at every width, tapping
                           every button, menu and tab

${style("bold", "Options of measure")}
  --pages /a,/b            pages no link points to
  --prune                  remove ghosts from ghostly.json that no page showed
  --max-pages <n>          follow links to at most n pages (default 50)
  --max-taps <n>           tap at most n elements per page and width
                           (default 100, 0 for none)
  --wait <ms>              how long a page may stay quiet before a <Ghost>
                           counts as never loading (default 3000)
  --cookie name=value      send a cookie with every page, e.g. a login
                           session (repeat for more cookies)

${style("bold", "Other")}
  -h, --help               show this help
  -v, --version            show the version`;

// The commands print their header first, so a problem ends their output:
// the message, a hint to the help if the arguments were wrong, a closing
// line.
function fail(error: unknown): void {
  if (!(error instanceof CliError)) throw error;
  log.error(error.message);
  if (error.showUsage) {
    log.message(style("dim", "Run `ghostly --help` for all options."));
  }
  outro(style("red", "Failed"));
  process.exitCode = 1;
}

function help(): void {
  console.log(`${header(`ghostly ${style("dim", version)}`)}\n${USAGE}\n`);
}

const [command, ...args] = process.argv.slice(2);

switch (command) {
  // Removed in 0.3.0: `measure` reaches everything by tapping now.
  case "dev":
    help();
    console.log(
      style(
        "red",
        "✗ `ghostly dev` was removed. `ghostly measure <url>` now taps every " +
          "button, menu and tab, so it measures every <Ghost> on its own.\n",
      ),
    );
    process.exitCode = 1;
    break;
  case "measure":
    runMeasure(args).catch(fail);
    break;
  case "-v":
  case "--version":
    console.log(version);
    break;
  case undefined:
  case "-h":
  case "--help":
    help();
    break;
  default:
    help();
    console.log(style("red", `✗ Unknown command "${command}".\n`));
    process.exitCode = 1;
}
