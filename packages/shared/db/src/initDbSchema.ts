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

export type DatabaseSchemaStatus = {
  status: "ok" | "not-initialised" | "broken"
  reason?: any
}

export async function isInitialised(databaseConfig: DatabaseConfig): Promise<DatabaseSchemaStatus> {
  // can be more sophisticated (checking schema of the tables aligns with what's
  // expected, value_at_times is indeed a hypertable, timescaledb is in use)
  const pool = makeConnectionPool(databaseConfig);

  const client = await pool.connect();
  try {
    // unit of measurement, retailers, categories, products, product_categories, value_at_times
    const tableExistenceResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `);

    const existingTables = new Set(
      tableExistenceResult.rows.map(row => row.table_name)
    );

    const typeExistenceResult = await pool.query(`SELECT EXISTS (
      SELECT 1
        FROM pg_type
        WHERE typname = 'unit_of_measurement'
    ) AS type_exists;
    `);

    let typeExists = typeExistenceResult.rowCount === 1 ? (typeExistenceResult.rows[0].type_exists) : false;

    const diagnostic = { 
      tableExistences: {
        retailers: existingTables.has('retailers'),
        categories: existingTables.has('categories'),
        products: existingTables.has('products'),
        product_categories: existingTables.has('product_categories'),
        value_at_times: existingTables.has('value_at_times'),
      },
      typeExistences: {
        unit_of_measurement: typeExists
      }
    }

    return {
      status: (
        Object.values(diagnostic.tableExistences).every(value => value === true) 
        && diagnostic.typeExistences.unit_of_measurement
      ) === true ? "ok" : (
        Object.values(diagnostic.tableExistences).every(value => value === false) 
        && !diagnostic.typeExistences.unit_of_measurement
      ) ? "not-initialised" : "broken",
      reason: diagnostic
    };
  } catch(error) {
    throw error;
  } finally {
    client.release();
    await pool.end();
  }

}
