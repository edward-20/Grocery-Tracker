import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile } from 'node:fs/promises';
import { readdir } from 'node:fs/promises';

try {
  const execFileAsync = promisify(execFile);

  const { stdout } = await execFileAsync(
    'pg_dump',
    [
        '-h', process.env.DB_HOST!,
        '-p', process.env.DB_PORT!,
        '-U', process.env.DB_USER!,
        '-d', process.env.DB_DATABASE!,
        '--data-only',
        '--inserts'
    ],
    {
        env: {
            ...process.env,
            PGPASSWORD: process.env.DB_PASSWORD
        }
    }
  );

  // find out what the latest migration was
  const migrationFiles = await readdir(new URL("../migrations/schema.sql", import.meta.url));
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
