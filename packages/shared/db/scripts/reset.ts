import { Pool } from "pg";
import { readFile } from "fs/promises";
import { readdir } from "fs/promises";

try {
  if (process.env.DB_HOST === undefined || process.env.DB_PORT === undefined || process.env.DB_DATABASE === undefined || process.env.DB_USER === undefined || process.env.DB_PASSWORD === undefined) {
    throw ".env file wasn't written"
  }
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  });


  const client = await pool.connect();

  // remove all current schemas and data
  await client.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");

  // run the schema
  const baseSchema = await readFile(new URL("../src/schema.sql", import.meta.url), "utf8");
  await client.query(baseSchema);

  // run the migrations
  for (const file of (await readdir(new URL("../migrations/", import.meta.url))).sort()) {
    const migration = await readFile(new URL(`../migrations/${file}`, import.meta.url), "utf8");
    await client.query(migration);
  }

} catch (error) {
  console.error(error);
}
