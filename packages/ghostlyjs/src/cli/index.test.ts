// Tests for the `ghostly` command. They run the built file
// (dist/cli/index.js) as a real Node process, like users run it, in a
// temporary folder. Run the build first (`bun run build`; turbo does it
// before `bun run test`).

import { spawn, type ChildProcess } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { request } from "node:http";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, beforeAll, describe, expect, test } from "vitest";

import { DEFAULT_PORT } from "../core/index";
import type { GhostBoxMeasurement } from "../core/types";

const cli = resolve(import.meta.dirname, "../../dist/cli/index.js");
const origin = "http://localhost:3000";
const measurement: GhostBoxMeasurement = {
  width: 100,
  height: 50,
  boxes: [{ x: 0, y: 0, width: 100, height: 50, radius: 8 }],
};

let folder: string;
let child: ChildProcess | undefined;

beforeAll(() => {
  if (!existsSync(cli)) throw new Error(`${cli} is missing, run the build`);
});

afterEach(async () => {
  if (child && child.exitCode === null) {
    const exited = new Promise((done) => child?.once("exit", done));
    child.kill();
    await exited;
  }
  child = undefined;
  if (folder) rmSync(folder, { recursive: true, force: true });
});

// Runs `ghostly <args>` in a new temporary folder.
function run(...args: string[]) {
  folder = mkdtempSync(join(tmpdir(), "ghostly-test-"));
  child = spawn(process.execPath, [cli, ...args], { cwd: folder });
  let output = "";
  child.stdout?.on("data", (chunk) => (output += chunk));
  child.stderr?.on("data", (chunk) => (output += chunk));
  return { process: child, output: () => output };
}

// Starts `ghostly dev` and waits until it listens.
async function startCollector(existing?: string) {
  const started = run("dev");
  if (existing !== undefined) {
    // Written before the collector reads it: it reads on start, and the
    // process needs far longer to start than this write.
    writeFileSync(join(folder, "ghostly.json"), existing);
  }
  await waitFor(() => {
    if (started.output().includes("EADDRINUSE")) {
      throw new Error(
        `port ${DEFAULT_PORT} is in use. Is \`ghostly dev\` running? Stop it for the tests.`,
      );
    }
    return started.output().includes("listening");
  });
  return started;
}

type Response = { status: number; headers: Record<string, unknown> };

function send(
  method: string,
  body?: string,
  headers: Record<string, string> = { origin },
): Promise<Response> {
  return new Promise((done, fail) => {
    const req = request(
      {
        host: "127.0.0.1",
        port: DEFAULT_PORT,
        method,
        headers: { "content-type": "application/json", ...headers },
      },
      (res) => {
        res.resume();
        res.on("end", () =>
          done({ status: res.statusCode ?? 0, headers: res.headers }),
        );
      },
    );
    req.on("error", fail);
    req.end(body);
  });
}

const patch = (name: string, value: unknown = measurement) =>
  send("PATCH", JSON.stringify({ name, measurement: value }));

const file = () => join(folder, "ghostly.json");
const readData = () => JSON.parse(readFileSync(file(), "utf8"));

async function waitFor(check: () => boolean, timeout = 5000) {
  const end = Date.now() + timeout;
  while (!check()) {
    if (Date.now() > end) throw new Error("timed out");
    await new Promise((done) => setTimeout(done, 20));
  }
}

describe("command line", () => {
  test("without a command, prints the usage", async () => {
    const { process, output } = run();
    const code = await new Promise((done) => process.once("exit", done));
    expect(code).toBe(0);
    expect(output()).toContain("Usage: ghostly dev");
  });

  test("an unknown command prints the usage and fails", async () => {
    const { process, output } = run("nope");
    const code = await new Promise((done) => process.once("exit", done));
    expect(code).toBe(1);
    expect(output()).toContain("Usage: ghostly dev");
  });
});

describe("ghostly dev", () => {
  test("stores a measurement in ghostly.json", async () => {
    await startCollector();
    expect((await patch("card")).status).toBe(204);
    await waitFor(() => existsSync(file()));
    expect(readData()).toEqual({ card: measurement });
  });

  test("writes the file once for many measurements, sorted by name", async () => {
    await startCollector();
    await Promise.all(["c", "a", "b"].map((name) => patch(name)));
    await waitFor(() => existsSync(file()));
    const text = readFileSync(file(), "utf8");
    expect(Object.keys(JSON.parse(text))).toEqual(["a", "b", "c"]);
    // Formatted with a newline at the end, so diffs stay small.
    expect(text.endsWith("}\n")).toBe(true);
  });

  test("keeps the entries that are already in the file", async () => {
    await startCollector(JSON.stringify({ old: measurement }));
    await patch("new");
    await waitFor(() => "new" in readData());
    expect(Object.keys(readData())).toEqual(["new", "old"]);
  });

  test("replaces a changed measurement", async () => {
    await startCollector(JSON.stringify({ card: measurement }));
    const changed = { ...measurement, height: 80 };
    await patch("card", changed);
    await waitFor(() => readData().card.height === 80);
    expect(readData()).toEqual({ card: changed });
  });

  test("doesn't write when nothing changed", async () => {
    // Not formatted like the collector would write it, so a write would
    // show.
    const existing = JSON.stringify({ card: measurement });
    const { output } = await startCollector(existing);
    expect((await patch("card")).status).toBe(204);
    // Longer than the collector waits before writing (100 ms).
    await new Promise((done) => setTimeout(done, 300));
    expect(readFileSync(file(), "utf8")).toBe(existing);
    expect(output()).not.toContain("updated");
  });

  test("answers the browser's preflight with CORS headers", async () => {
    await startCollector();
    const response = await send("OPTIONS");
    expect(response.status).toBe(204);
    expect(response.headers).toMatchObject({
      "access-control-allow-origin": origin,
      "access-control-allow-methods": "PATCH",
    });
  });

  test.each([
    ["another site", "http://example.com"],
    ["a look-alike host", "http://localhost.example.com"],
    ["https", "https://localhost:3000"],
    ["no origin", undefined],
  ])("rejects requests from %s", async (_, from) => {
    await startCollector();
    const headers: Record<string, string> = from ? { origin: from } : {};
    const response = await send(
      "PATCH",
      JSON.stringify({ name: "card", measurement }),
      headers,
    );
    expect(response.status).toBe(403);
    await new Promise((done) => setTimeout(done, 200));
    expect(existsSync(file())).toBe(false);
  });

  test("accepts 127.0.0.1 as origin", async () => {
    await startCollector();
    const response = await send(
      "PATCH",
      JSON.stringify({ name: "card", measurement }),
      { origin: "http://127.0.0.1:5173" },
    );
    expect(response.status).toBe(204);
  });

  test("only accepts PATCH", async () => {
    await startCollector();
    expect((await send("GET")).status).toBe(405);
    expect((await send("POST", "{}")).status).toBe(405);
  });

  test.each([
    ["broken JSON", "{"],
    ["no name", JSON.stringify({ measurement })],
    ["no boxes", JSON.stringify({ name: "card", measurement: { width: 1 } })],
  ])("rejects %s", async (_, body) => {
    await startCollector();
    expect((await send("PATCH", body)).status).toBe(400);
  });
});
