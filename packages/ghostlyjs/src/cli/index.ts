// Entry of the `ghostly` command. The build adds the Node shebang.

import { startDevServer } from "./dev";
import { CliError, runMeasure } from "./measure";

const USAGE = `Usage:
  ghostly dev              collect measurements while you use the app
  ghostly measure <url>    measure every page at every breakpoint

Options of measure:
  --pages /a,/b            pages no link points to
  --prune                  remove ghosts from ghostly.json that no page showed
  --max-pages <n>          follow links to at most n pages (default 50)
  --wait <ms>              how long a page may stay quiet before a <Ghost>
                           counts as never loading (default 3000)`;

const [command, ...args] = process.argv.slice(2);

switch (command) {
  case "dev":
    startDevServer();
    break;
  case "measure":
    runMeasure(args).catch((error: unknown) => {
      if (!(error instanceof CliError)) throw error;
      console.error(`\n✗ ${error.message}`);
      if (error.showUsage) console.error(`\n${USAGE}`);
      process.exitCode = 1;
    });
    break;
  default:
    console.log(USAGE);
    process.exitCode = command ? 1 : 0;
}
