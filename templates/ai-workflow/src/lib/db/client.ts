import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { databaseConfig } from "./config";
import * as chatSchema from "@/lib/chat/schema";

const schema = {
  ...chatSchema,
};

const pool = new Pool({
  connectionString: databaseConfig.server.url,
});
attachDatabasePool(pool);

const db = drizzle({ client: pool, schema });

export { db };
