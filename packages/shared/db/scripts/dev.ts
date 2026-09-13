/*
 * stopped (no container running) -> start (container running, uninitialised
 * volume) -> reset (volume with schema no data) -> seeded (volume with schema
 * and data)
 */
import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

export enum Stage {
  Stopped,
  StartedBare,
  SchemaInited,
  Seeded,
}

const execFileAsync = promisify(execFile);
const composeFile = fileURLToPath(new URL("../compose.yaml", import.meta.url));
const packageDirectory = fileURLToPath(new URL("../", import.meta.url));

const databaseStageQuery = `
  SELECT CASE
    WHEN to_regclass('public.retailers') IS NULL THEN 'started-bare'
    WHEN EXISTS (SELECT FROM public.retailers LIMIT 1) THEN 'seeded'
    ELSE 'schema-inited'
  END;
`;

/**
 * Determines the lifecycle state of the local Compose-managed Postgres
 * instance. A seeded database always contains at least one retailer, while a
 * reset database has the retailers table but no rows.
 */
export async function determineStage(): Promise<Stage> {
  if (
    process.env.DB_HOST === undefined ||
    process.env.DB_PORT === undefined ||
    process.env.DB_DATABASE === undefined ||
    process.env.DB_USER === undefined ||
    process.env.DB_PASSWORD === undefined
  ) {
    throw new Error(".env file wasn't written");
  }

  const { stdout } = await execFileAsync(
    "docker",
    [
      "compose",
      "-f",
      composeFile,
      "ps",
      "--services",
      "--filter",
      "status=running",
    ],
  );

  if (!stdout.split(/\r?\n/).some((service) => service.trim() === "postgres")) {
    return Stage.Stopped;
  }

  const { stdout: stage } = await execFileAsync(
    "docker",
    [
      "compose",
      "-f",
      composeFile,
      "exec",
      "-T",
      "postgres",
      "psql",
      "-qtAX",
      "-U",
      process.env.DB_USER,
      "-d",
      process.env.DB_DATABASE,
      "-c",
      databaseStageQuery,
    ],
  );

  switch (stage.trim()) {
    case "started-bare":
      return Stage.StartedBare;
    case "schema-inited":
      return Stage.SchemaInited;
    case "seeded":
      return Stage.Seeded;
    default:
      throw new Error(`Unexpected database stage returned by Postgres: ${stage.trim() || "(empty)"}`);
  }
}

async function startPostgres() {
  await execFileAsync("docker", ["compose", "-f", composeFile, "up", "-d"]);

  const deadline = Date.now() + 30_000;
  while (true) {
    try {
      await execFileAsync("docker", [
        "compose",
        "-f",
        composeFile,
        "exec",
        "-T",
        "postgres",
        "pg_isready",
        "-U",
        process.env.DB_USER!,
        "-d",
        process.env.DB_DATABASE!,
      ]);
      return;
    } catch (error) {
      if (Date.now() >= deadline) {
        throw new Error("Postgres did not become ready within 30 seconds", { cause: error });
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
}

async function runLifecycleScript(script: "reset" | "seed") {
  const { stdout, stderr } = await execFileAsync("pnpm", ["run", script], {
    cwd: packageDirectory,
    env: process.env,
    maxBuffer: 10 * 1024 * 1024,
  });

  process.stdout.write(stdout);
  process.stderr.write(stderr);
}

async function main() {
  let stage = await determineStage();
  while (stage !== Stage.Seeded) {
    if (stage === Stage.Stopped) {
      console.log("Starting Postgres...");
      await startPostgres();
    } else if (stage === Stage.StartedBare) {
      console.log("Initialising the database schema...");
      await runLifecycleScript("reset");
    } else if (stage === Stage.SchemaInited) {
      console.log("Seeding the database...");
      await runLifecycleScript("seed");
    } else {
      throw new Error(`Cannot progress from unexpected stage: ${Stage[stage]}`);
    }

    const nextStage = await determineStage();
    if (nextStage === stage) {
      throw new Error(`The database did not progress from ${Stage[stage]}`);
    }
    stage = nextStage;
  }

  console.log("Database is seeded and ready.");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
