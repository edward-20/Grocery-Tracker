import { loadConfig } from "../config/loadConfig.js";
import { Pool } from "pg";
const config = loadConfig(process.env.SCRAPER_CONFIG);

export function makeConnectionPool() : Pool {
  const pool = new Pool({
    ...config.database
  });
  pool.on('error', (err, _) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
  })
  return pool;
}

