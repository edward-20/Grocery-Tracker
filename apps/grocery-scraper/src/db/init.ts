import { makeConnectionPool } from "@grocery-tracker/db";
import { QueryResult } from "pg";
import { readFile } from "node:fs/promises";
import { loadConfig } from "../config/loadConfig.js";

const config = loadConfig(process.env.SCRAPER_CONFIG);
const pool = makeConnectionPool(config.database);

const sql = await readFile(
  new URL("../src/db/schema.sql", import.meta.url), // this needs to be fixed
  'utf-8'
)

const client = await pool.connect();
let res: QueryResult;
try {
  res = await client.query(sql);
} catch(error) {
  console.error(error);
} finally {
  client.release();
}

await pool.end();

console.log(`Initialized Postgres database ${config.database.database}`);
