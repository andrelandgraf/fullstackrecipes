import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { databaseConfig } from "./config";

import * as authSchema from "@/lib/auth/schema";
import * as chatSchema from "@/lib/chat/schema";
import * as recipeSchema from "@/lib/recipes/schema";

const schema = {
  ...authSchema,
  ...chatSchema,
  ...recipeSchema,
};

const pool = new Pool({
  connectionString: databaseConfig.server.url,
});
attachDatabasePool(pool);

const db = drizzle({ client: pool, schema });

export { db };
