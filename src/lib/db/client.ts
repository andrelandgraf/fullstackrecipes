import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { databaseConfig } from "./config";
import * as schema from "./schema";

const pool = new Pool({
  connectionString: databaseConfig.url,
});
attachDatabasePool(pool);

const db = drizzle({ client: pool, schema });

export { db };
