import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile } from 'node:fs/promises';
import { readdir } from 'node:fs/promises';

// uses docker compose to dump a psql file
try {
  const execFileAsync = promisify(execFile);

  const { stdout } = await execFileAsync(
    'docker',
    [
      'compose',
      'exec',
      '-T',
      'postgres',
      'pg_dump',
      '-U', process.env.DB_USER!,
      '-d', process.env.DB_DATABASE!,
      '--data-only',
      '--inserts'
    ],
    {
      maxBuffer: 500 * 1024 * 1024
    }
  );

  // find out what the latest migration was
  const migrationFiles = await readdir(new URL("../migrations/", import.meta.url));
  const lastMigrationFile = migrationFiles.sort().at(-1);

  const match = lastMigrationFile?.match(/^(\d+)\.migration\.sql$/);
  const lastMigrationNumber = match ? match[1] : undefined;

  if (lastMigrationNumber) {
    await writeFile(new URL(`../seed/${lastMigrationNumber}/${(new Date()).getTime()}`, import.meta.url), stdout);
  } else {
    await writeFile(new URL(`../seed/baseSchema/${(new Date()).getTime()}`, import.meta.url), stdout);
  }
} catch (error) {
  console.error(error);
}
