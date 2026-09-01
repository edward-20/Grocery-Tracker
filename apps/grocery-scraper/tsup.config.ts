import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    cli: "src/cli.ts",
    singleRun: "src/singleRun.ts",
    worker: "src/worker.ts"
  },
  format: ["esm"],
  dts: true,
  clean: true
});
