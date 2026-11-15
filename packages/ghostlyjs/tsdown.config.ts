import { copyFileSync } from "node:fs";

import { defineConfig, type UserConfig } from "tsdown";

// Kept once in the repo root, for GitHub. npm takes a package's README and
// LICENSE from its own folder, so the build copies them here (gitignored).
const ROOT_FILES = ["README.md", "LICENSE"];

// Defaults cover the rest: ESM, .js/.d.ts extensions, type declarations.
const config: UserConfig = defineConfig({
  // One package, three entries. Paths match `exports` and `bin`.
  entry: {
    "react/index": "src/react/index.ts",
    "core/index": "src/core/index.ts",
    "cli/index": "src/cli/index.ts",
  },
  // Browser and Node code in one build (the default `node` would emit .mjs).
  platform: "neutral",
  // `neutral` doesn't know Node's built-in modules; the cli imports them
  // from Node at runtime.
  deps: { neverBundle: [/^node:/] },
  // Bundling drops "use client", so it is added back; the cli needs a shebang.
  banner: ({ fileName }) => {
    if (!fileName.endsWith(".js")) return undefined;
    if (fileName.startsWith("react/")) return '"use client";';
    if (fileName.startsWith("cli/")) return "#!/usr/bin/env node";
    return undefined;
  },
  hooks: {
    "build:done": () => {
      for (const file of ROOT_FILES) copyFileSync(`../../${file}`, file);
    },
  },
});

export default config;
