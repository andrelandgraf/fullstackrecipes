import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import assert from "../common/assert";
import * as schema from "./schema";

assert(
  process.env.DATABASE_URL,
  "DATABASE_URL environment variable must be set",
);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
attachDatabasePool(pool);

const db = drizzle({ client: pool, schema });

export { db };
