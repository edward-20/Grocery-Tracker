import { readFile } from "node:fs/promises";
import { readdir } from "fs/promises";
import { spawn } from "node:child_process";


// uses docker compose to run psql commands from seed file
try {
  if (process.env.DB_HOST === undefined || process.env.DB_PORT === undefined || process.env.DB_DATABASE === undefined || process.env.DB_USER === undefined || process.env.DB_PASSWORD === undefined) {
    throw ".env file wasn't written"
  }

  // find out what the latest migration was
  const migrationFiles = await readdir(new URL("../migrations/", import.meta.url));
  const lastMigrationFile = migrationFiles.sort().at(-1);

  const match = lastMigrationFile?.match(/^(\d+)\.migration\.sql$/);
  const lastMigrationNumber = match ? match[1] : undefined;

  let seedFiles: string[];
  if (lastMigrationNumber) {
    seedFiles = (await readdir(new URL(`../seed/${lastMigrationNumber}/`, import.meta.url))).sort();
  } else {
    seedFiles = (await readdir(new URL(`../seed/baseSchema/`, import.meta.url))).sort();
  }
  const seedFileName = seedFiles.at(-1);

  const seed = await readFile(
    new URL(`../seed/${lastMigrationNumber ?? "baseSchema"}/${seedFileName}`, import.meta.url),
    'utf8'
  );

  const child = spawn(
    'docker',
    [
      'compose',
      '-f', './compose.yaml',
      'exec',
      '-T',
      'postgres',
      'psql',
      '-U', process.env.DB_USER!,
      '-d', process.env.DB_DATABASE!,
    ],
    {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PGPASSWORD: process.env.DB_PASSWORD,
      },
    }
  );

  child.stdout.on('data', data => {
    process.stdout.write(data);
  });

  child.stderr.on('data', data => {
    process.stderr.write(data);
  });

  child.stdin.write(seed);
  child.stdin.end();

} catch (error) {
  console.error(error);
}
