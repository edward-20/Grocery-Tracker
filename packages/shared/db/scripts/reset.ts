// remove all schemas
import { Pool } from "pg";


try {
  if (process.env.PORT === undefined || process.env.DB === undefined || process.env.USER === undefined || process.env.PASSWORD === undefined) {
    throw ".env file wasn't written"
  }
  const pool = new Pool({
    host: "localhost",
    port: Number(process.env.PORT),
    database: process.env.DB,
    user: process.env.USER,
    password: process.env.PASSWORD
  });

  const client = pool.connect();
} catch (error) {
  console.error(error);
}
