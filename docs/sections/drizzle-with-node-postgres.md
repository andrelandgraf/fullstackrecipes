## Neon + Drizzle Setup

Connect your Next.js app to a Neon Postgres database using Drizzle ORM with optimized connection pooling for Vercel.

### Step 1: Install packages

```bash
npm i drizzle-orm pg @vercel/functions
npm i -D drizzle-kit @types/pg
```

### Step 2: Add your connection string

Create a `.env.local` file with your Neon database URL:

```env
DATABASE_URL="postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require"
```

> **Note**: Get your connection string from the Neon console. Make sure to use the pooled connection string for production workloads.

### Step 3: Create the database client

Create `src/lib/db/client.ts`:

```typescript
import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { databaseConfig } from "./config";

import * as authSchema from "@/lib/auth/schema";
import * as chatSchema from "@/lib/chat/schema";

const schema = {
  ...authSchema,
  ...chatSchema,
};

const pool = new Pool({
  connectionString: databaseConfig.url,
});
attachDatabasePool(pool);

const db = drizzle({ client: pool, schema });

export { db };
```

The `databaseConfig` import provides type-safe access to the `DATABASE_URL` environment variable. See the [Environment Variable Management](/recipes/env-config) recipe for the config setup pattern.

Each feature library owns its own schema file (e.g., `@/lib/auth/schema`, `@/lib/chat/schema`). Instead of a central `db/schema.ts` aggregation file, schemas are imported directly in `client.ts` and merged into a single object for type-safe queries.

### Step 4: Configure Drizzle Kit

Create `drizzle.config.ts` in your project root:

```typescript
import { defineConfig } from "drizzle-kit";
import { databaseConfig } from "./src/lib/db/config";

export default defineConfig({
  schema: "./src/lib/*/schema.ts",
  out: "./src/lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseConfig.url,
  },
});
```

The `schema` glob pattern picks up `schema.ts` files from all feature libraries in `src/lib/`, following the "everything is a library" pattern where each feature owns its own schema. See [Philosophy](/philosophy) for more details.

### Step 5: Add package.json scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate"
  }
}
```

### Step 6: Generate and run migrations

```bash
bun run db:generate
bun run db:migrate
```

---

## Understanding Connection Pooling

The `attachDatabasePool` helper from `@vercel/functions` is the key to efficient database connections on Vercel.

**Why it matters:**

1. **Without pooling**: Each request opens a new TCP connection (~8 roundtrips), adding latency
2. **With pooling**: The first request establishes a connection; subsequent requests reuse it instantly
3. **The helper**: `attachDatabasePool` ensures idle connections close gracefully before function suspension, preventing connection leaks

**Best practices:**

- Define the pool at module scope (globally) so all requests share it
- Keep minimum pool size at 1 for good concurrency
- Use Vercel's Rolling releases to avoid connection surges during deployments

---

## Info: Alternative Drivers

This recipe uses `node-postgres` (the `pg` package) because it provides the best performance on Vercel with Fluid compute. However, Drizzle supports other Postgres drivers:

| Driver              | When to consider                                                                    |
| ------------------- | ----------------------------------------------------------------------------------- |
| **postgres.js**     | If you prefer its API or need specific features like tagged template queries        |
| **Neon Serverless** | For platforms without connection pooling (Netlify, Deno Deploy, Cloudflare Workers) |

> **Note**: If you're deploying to a serverless platform that doesn't support connection pooling, the [Neon Serverless driver](https://orm.drizzle.team/docs/connect-neon) connects over HTTP (~3 roundtrips) instead of TCP (~8 roundtrips), which is faster for single queries in classic serverless environments.

---

## References

- [Drizzle Postgres docs](https://orm.drizzle.team/docs/get-started-postgresql)
- [Drizzle Neon integration](https://orm.drizzle.team/docs/connect-neon)
- [Vercel Connection Pooling Guide](https://vercel.com/guides/connection-pooling-with-functions)
- [Neon + Vercel Connection Methods](https://neon.tech/docs/guides/vercel-connection-methods)
