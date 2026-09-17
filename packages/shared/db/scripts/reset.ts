import { Pool } from "pg";
import { readFile } from "fs/promises";
import { readdir } from "fs/promises";
import { loadConfig } from "@grocery-tracker/utils";



const config = loadConfig(process.env.CONFIG_PATH);
const pool = new Pool({
  ...config.database
});
const client = await pool.connect();
try {

  // run the schema
  const baseSchema = await readFile(new URL("../src/schema.sql", import.meta.url), "utf8");
  console.log("Running base schema...")
  await client.query(baseSchema);
  console.log("Base schema initialisation completed")

  // run the migrations
  const migrationsUrl = new URL("../migrations/", import.meta.url);
  const migrationFiles = await readdir(migrationsUrl);
  for (const file of migrationFiles.sort()) {
    console.log(`Running migration ${new URL(`../migrations/${file}`, import.meta.url)}`);
    const migration = await readFile(new URL(`../migrations/${file}`, import.meta.url), "utf8");
    await client.query(migration);
  }

} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
