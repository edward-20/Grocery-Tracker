import { spawn } from "node:child_process";

const child = spawn(
  "docker",
  ["compose", "-f", "compose.yaml", "down", "-v"],
  {
    stdio: "inherit",
  },
);

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
