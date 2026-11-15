// `ghostly dev`: receives measurements from <Ghost> while you use the app
// and stores them in `ghostly.json`.

import { createServer } from "node:http";

import { intro, log, outro } from "@clack/prompts";

import { DEFAULT_PORT } from "../core/index";
import {
  ghostlyFile,
  isMeasurementMessage,
  readGhostlyFile,
  sortByKey,
  writeGhostlyFile,
} from "./ghostly-file";
import { header, style, time } from "./style";

export function startDevServer(): void {
  console.log(header("ghostly dev"));
  intro("Collecting measurements");

  const file = ghostlyFile();
  // Kept in memory, so <Ghost>s sending at the same time can't overwrite
  // each other's entries.
  const data = readGhostlyFile(file);
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
      const message: unknown = JSON.parse(body);
      if (!isMeasurementMessage(message)) throw new Error("not a measurement");
      const { name, breakpoint, measurement } = message;
      // One measurement per breakpoint; the others of this <Ghost> stay.
      const entry = data[name] ?? {};
      // Only write on real changes. Writing reloads the app, which measures
      // again; unchanged values end that loop.
      if (JSON.stringify(entry[breakpoint]) !== JSON.stringify(measurement)) {
        data[name] = sortByKey({ ...entry, [breakpoint]: measurement });
        log.step(
          `${time()}  updated ${style("bold", name)} ${style("dim", breakpoint)}`,
        );
        // All <Ghost>s measure at once; write the file once for all of them.
        clearTimeout(writeTimer);
        writeTimer = setTimeout(() => writeGhostlyFile(file, data), 100);
      }
      response.writeHead(204).end();
    } catch {
      response.writeHead(400).end();
    }
  });

  server.on("error", (error: NodeJS.ErrnoException) => {
    // Most likely a second `ghostly dev`; the port is fixed, because
    // <Ghost> sends to it.
    log.error(
      error.code === "EADDRINUSE"
        ? `Port ${DEFAULT_PORT} is in use. Is \`ghostly dev\` already running?`
        : error.message,
    );
    outro(style("red", "Failed"));
    process.exitCode = 1;
  });
  // 127.0.0.1: reachable from this machine only, not from the network.
  server.listen(DEFAULT_PORT, "127.0.0.1", () => {
    log.success(`Listening on http://localhost:${DEFAULT_PORT}`);
    log.info(
      `Writing to ${style("cyan", file)}\n` +
        style(
          "dim",
          "Open your app in dev mode; every <Ghost> sends its measurement.",
        ),
    );
  });

  // Ctrl+C: end the output with a closing line instead of mid-way.
  process.once("SIGINT", () => {
    outro("Stopped");
    process.exit(0);
  });
}
