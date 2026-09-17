import { spawn } from "node:child_process";
import { loadConfig } from "@grocery-tracker/utils";

const config = loadConfig(process.env.CONFIG_PATH);
const db = config.database;

const child = spawn(
  "docker",
  ["compose", "-f", "compose.yaml", "down"],
  {
    stdio: "inherit",
    env: {
      DB_HOST: db.host,
      DB_PORT: String(db.port),
      DB_DATABASE: db.database,
      DB_USER: db.user,
      DB_PASSWORD: db.password
    },
  },
);

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
