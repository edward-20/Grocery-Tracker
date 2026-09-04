import { Pool } from "pg";
import { readFile } from "fs/promises";
import { readdir } from "fs/promises";

try {
  if (process.env.HOST === undefined || process.env.PORT === undefined || process.env.DATABASE === undefined || process.env.USER === undefined || process.env.PASSWORD === undefined) {
    throw ".env file wasn't written"
  }
  const pool = new Pool({
    host: process.env.HOST,
    port: Number(process.env.PORT),
    database: process.env.DATABASE,
    user: process.env.USER,
    password: process.env.PASSWORD
  });

  const client = await pool.connect();

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
  const seed = await readFile(new URL(`../seed/${lastMigrationNumber ?? "baseSchema"}/${seedFileName}`), "utf8");
  await client.query(seed);
} catch (error) {
  console.error(error);
}
