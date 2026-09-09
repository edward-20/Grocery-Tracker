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

if (process.env.DB_HOST === undefined || process.env.DB_PORT === undefined || process.env.DB_DATABASE === undefined || process.env.DB_USER === undefined || process.env.DB_PASSWORD === undefined) {
  throw ".env file wasn't written"
}
const client = await pool.connect();
try {

  // remove all current schemas and data
  // console.log("Dropping current schemas...");
  // await client.query("DROP SCHEMA public CASCADE;");
  // console.log("Dropped");
  // console.log("Creating new public schema...");
  // await client.query("CREATE SCHEMA public;");
  // console.log("Created public schema");

  // run the schema
  const baseSchema = await readFile(new URL("../src/schema.sql", import.meta.url), "utf8");
  console.log("Running base schema...")
  await client.query(baseSchema);
  console.log("Base schema initialisation completed")
  console.log("Seeding retailers...")
  const retailerSeed = await readFile(new URL("../src/seedRetailers.sql", import.meta.url), "utf8");
  await client.query(retailerSeed);
  console.log("Seeded retailers")

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
