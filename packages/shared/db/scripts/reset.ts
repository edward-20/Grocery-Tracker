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
