import { DatabaseConfig, makeConnectionPool } from "./createPool.js";
import schema from "./schema.sql";

export async function initDbSchema(databaseConfig: DatabaseConfig) {
  const pool = makeConnectionPool(databaseConfig);

  const client = await pool.connect();
  try {
    await client.query(schema);
  } catch(error) {
    console.error(error);
  } finally {
    client.release();
  }

  await pool.end();
  console.log(`Initialized Postgres database ${databaseConfig.database}`);
}
