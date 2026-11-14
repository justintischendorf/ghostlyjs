// Entry of the `ghostly` command. The build adds the Node shebang.

import { DEFAULT_PORT } from "../core/index";

const command = process.argv[2];

switch (command) {
  case "dev":
  case "generate":
    console.log(
      `ghostly ${command}: not implemented yet (port ${DEFAULT_PORT})`,
    );
    break;
  default:
    console.log("Usage: ghostly <dev|generate>");
    process.exitCode = command ? 1 : 0;
}
