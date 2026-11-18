import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // `@/components/...` like in the Next.js playground, so both share the
    // same files.
    alias: { "@": fileURLToPath(new URL("src", import.meta.url)) },
    // `ghostlyjs` is linked from the workspace and has React 19 as a dev
    // dependency. Without this, its `import "react"` would load that copy
    // instead of this app's React 18, and two Reacts on one page break hooks.
    dedupe: ["react", "react-dom"],
  },
});
