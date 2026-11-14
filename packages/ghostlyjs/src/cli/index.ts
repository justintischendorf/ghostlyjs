// Entry of the `ghostly` command. The build adds the Node shebang.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { resolve } from "node:path";

import { DEFAULT_PORT } from "../core/index";
import type { GhostlyData } from "../core/types";

const command = process.argv[2];

switch (command) {
  case "dev":
    startDevServer();
    break;
  default:
    console.log("Usage: ghostly dev");
    process.exitCode = command ? 1 : 0;
}

// Receives measurements from <Ghost> and stores them in `ghostly.json`.
function startDevServer(): void {
  const file = resolve(process.cwd(), "ghostly.json");
  // Kept in memory, so <Ghost>s sending at the same time can't overwrite
  // each other's entries.
  const data: GhostlyData = existsSync(file)
    ? JSON.parse(readFileSync(file, "utf8"))
    : {};
  let writeTimer: NodeJS.Timeout | undefined;

  const server = createServer(async (request, response) => {
    // Only pages running on this machine may send measurements.
    const origin = request.headers.origin ?? "";
    if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      response.writeHead(403).end();
      return;
    }
    // CORS: the app (e.g. localhost:3000) is another origin than this server.
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Access-Control-Allow-Methods", "PATCH");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type");
    // The browser asks first (preflight) before sending a JSON PATCH.
    if (request.method !== "PATCH") {
      response.writeHead(request.method === "OPTIONS" ? 204 : 405).end();
      return;
    }

    try {
      let body = "";
      for await (const chunk of request) body += chunk;
      const { name, measurement } = JSON.parse(body);
      if (typeof name !== "string" || !Array.isArray(measurement?.boxes)) {
        throw new Error("not a measurement");
      }
      // Only write on real changes. Writing reloads the app, which measures
      // again; unchanged values end that loop.
      if (JSON.stringify(data[name]) !== JSON.stringify(measurement)) {
        data[name] = measurement;
        console.log(`ghostly dev: updated "${name}"`);
        // All <Ghost>s measure at once; write the file once for all of them,
        // sorted by name so the file only changes where values change.
        clearTimeout(writeTimer);
        writeTimer = setTimeout(() => {
          const sorted = Object.fromEntries(Object.entries(data).sort());
          writeFileSync(file, `${JSON.stringify(sorted, null, 2)}\n`);
        }, 100);
      }
      response.writeHead(204).end();
    } catch {
      response.writeHead(400).end();
    }
  });

  server.on("error", (error) => {
    console.error(`ghostly dev: ${error.message}`);
    process.exitCode = 1;
  });
  // 127.0.0.1: reachable from this machine only, not from the network.
  server.listen(DEFAULT_PORT, "127.0.0.1", () => {
    console.log(`ghostly dev: listening on http://localhost:${DEFAULT_PORT}`);
    console.log(`ghostly dev: writing to ${file}`);
  });
}
