import { makeConnectionPool } from "./createPool.js";
import { QueryResult } from "pg";
import { readFile } from "node:fs/promises";
import { loadConfig } from "../config/loadConfig.js";

const pool = makeConnectionPool();

const sql = await readFile(
  './src/db/schema.sql',
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

const config = loadConfig(process.env.SCRAPER_CONFIG);

console.log(`Initialized Postgres database ${config.database.database}`);
