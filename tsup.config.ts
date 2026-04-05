import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: { index: "src/index.ts" },
    format: ["cjs", "esm"],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    shims: true,
  },
  {
    entry: { cli: "src/cli.ts" },
    format: ["cjs"],
    splitting: false,
    sourcemap: true,
    shims: true,
    banner: {
      js: "#!/usr/bin/env node",
    },
  },
]);
