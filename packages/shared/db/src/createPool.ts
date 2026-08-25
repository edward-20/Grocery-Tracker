import { Pool } from "pg";

type DatabaseConfig = {
  host: string,
  port: number,
  database: string,
  user: string,
  password: string
} 
export function makeConnectionPool(config: DatabaseConfig) : Pool {
  const pool = new Pool({
    ...config
  });
  pool.on('error', (err, _) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
  })
  return pool;
}

