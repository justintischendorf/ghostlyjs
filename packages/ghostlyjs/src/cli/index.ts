// Entry of the `ghostly` command. The build adds the Node shebang.

import { createRequire } from "node:module";

import { log, outro } from "@clack/prompts";

import { CliError } from "./cli-error";
import { startDevServer } from "./dev";
import { runMeasure } from "./measure";
import { header, style } from "./style";

// The package's own package.json: two folders up from src/cli and from
// dist/cli alike.
const { version } = createRequire(import.meta.url)("../../package.json") as {
  version: string;
};

const USAGE = `${style("bold", "Usage")}
  ghostly dev              collect measurements while you use the app
  ghostly measure <url>    measure every page at every breakpoint

${style("bold", "Options of measure")}
  --pages /a,/b            pages no link points to
  --prune                  remove ghosts from ghostly.json that no page showed
  --max-pages <n>          follow links to at most n pages (default 50)
  --wait <ms>              how long a page may stay quiet before a <Ghost>
                           counts as never loading (default 3000)

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
  case "dev":
    try {
      startDevServer();
    } catch (error) {
      fail(error);
    }
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
