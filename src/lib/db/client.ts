import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { serverConfig } from "../config/server";
import * as schema from "./schema";

const pool = new Pool({
  connectionString: serverConfig.database.url,
});
attachDatabasePool(pool);

const db = drizzle({ client: pool, schema });

export { db };
