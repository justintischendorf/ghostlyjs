import { defineConfig, type UserConfig } from "tsdown";

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
});

export default config;
