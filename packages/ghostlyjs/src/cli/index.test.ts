// Tests for the `ghostly` command. They run the built file
// (dist/cli/index.js) as a real Node process, like users run it, in a
// temporary folder. Run the build first (`bun run build`; turbo does it
// before `bun run test`).

import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, beforeAll, describe, expect, test } from "vitest";

const cli = resolve(import.meta.dirname, "../../dist/cli/index.js");

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

describe("command line", () => {
  test("without a command, prints the usage", async () => {
    const { process, output } = run();
    const code = await new Promise((done) => process.once("exit", done));
    expect(code).toBe(0);
    expect(output()).toMatch(/ghostly measure <url>/);
  });

  test.each(["--help", "-h"])("%s prints the usage", async (flag) => {
    const { process, output } = run(flag);
    const code = await new Promise((done) => process.once("exit", done));
    expect(code).toBe(0);
    expect(output()).toMatch(/ghostly measure <url>/);
  });

  test.each(["--version", "-v"])("%s prints the version", async (flag) => {
    const { version } = JSON.parse(
      readFileSync(resolve(import.meta.dirname, "../../package.json"), "utf8"),
    );
    const { process, output } = run(flag);
    const code = await new Promise((done) => process.once("exit", done));
    expect(code).toBe(0);
    expect(output().trim()).toBe(version);
  });

  test("an unknown command prints the usage and fails", async () => {
    const { process, output } = run("nope");
    const code = await new Promise((done) => process.once("exit", done));
    expect(code).toBe(1);
    expect(output()).toMatch(/ghostly measure <url>/);
  });

  // It was replaced by `ghostly measure`, which taps everything now.
  test("`ghostly dev` explains that it is gone", async () => {
    const { process, output } = run("dev");
    const code = await new Promise((done) => process.once("exit", done));
    expect(code).toBe(1);
    expect(output()).toContain("`ghostly dev` was removed");
    expect(output()).not.toMatch(/ghostly dev +collect/);
  });
});
