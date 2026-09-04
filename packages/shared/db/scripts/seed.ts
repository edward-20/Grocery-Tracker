import { Pool } from "pg";
import { readFile } from "fs/promises";
import { readdir } from "fs/promises";

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

const client = await pool.connect();

try {
  if (process.env.DB_HOST === undefined || process.env.DB_PORT === undefined || process.env.DB_DATABASE === undefined || process.env.DB_USER === undefined || process.env.DB_PASSWORD === undefined) {
    throw ".env file wasn't written"
  }

  // find out what the latest migration was
  const migrationFiles = await readdir(new URL("../migrations/schema.sql", import.meta.url));
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
  const seed = await readFile(new URL(`../seed/${lastMigrationNumber ?? "baseSchema"}/${seedFileName}`, import.meta.url), "utf8");
  await client.query(seed);
} catch (error) {
  console.error(error);
} finally {
  client.release();
  await pool.end();
}
