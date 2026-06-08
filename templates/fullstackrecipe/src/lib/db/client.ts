import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { databaseConfig } from "./config";
import * as authSchema from "@/lib/auth/schema";
import * as chatSchema from "@/lib/chat/schema";
import * as stripeSchema from "@/lib/stripe/schema";

const schema = {
  ...authSchema,
  ...chatSchema,
  ...stripeSchema,
};

const pool = new Pool({
  connectionString: databaseConfig.server.url,
});
attachDatabasePool(pool);

const db = drizzle({ client: pool, schema });

export { db };
