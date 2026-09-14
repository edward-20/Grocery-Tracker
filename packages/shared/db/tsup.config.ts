import { defineConfig } from "tsup";
import { copyFile } from "node:fs/promises";

const sqlFiles = ["schema.sql", "seedRetailers.sql"];

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  loader: {
    ".sql": "text"
  },
  onSuccess: async () => {
    await Promise.all(sqlFiles.map(file => copyFile(`src/${file}`, `dist/${file}`)));
  },
});
