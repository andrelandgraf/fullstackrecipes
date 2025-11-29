## Neon + Drizzle Setup

Connect your Next.js app to a Neon PostgreSQL database using Drizzle ORM with optimized connection pooling for Vercel.

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
import { serverConfig } from "../config/server";
import * as schema from "./schema";

const pool = new Pool({
  connectionString: serverConfig.database.url,
});

attachDatabasePool(pool);

const db = drizzle({ client: pool, schema });

export { db };
```

> **Note**: This uses the type-safe `serverConfig` pattern instead of accessing `process.env` directly. See the [Environment Variable Management](/recipes/env-config) recipe for setup details.

### Step 4: Create your schema file

Create `src/lib/db/schema.ts` to re-export all table definitions from your feature libs:

```typescript
export * from "@/lib/chat/schema";
export * from "@/lib/stripe/schema";
```

Each feature lib owns its own schema. The central `db/schema.ts` just aggregates them for Drizzle.

### Step 5: Configure Drizzle Kit

Create `drizzle.config.ts` in your project root:

```typescript
import { defineConfig } from "drizzle-kit";
import { databaseConfig } from "./src/lib/db/config";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseConfig.url,
  },
});
```

### Step 6: Generate and run migrations

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
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

This recipe uses `node-postgres` (the `pg` package) because it provides the best performance on Vercel with Fluid compute. However, Drizzle supports other PostgreSQL drivers:

| Driver              | When to consider                                                                    |
| ------------------- | ----------------------------------------------------------------------------------- |
| **postgres.js**     | If you prefer its API or need specific features like tagged template queries        |
| **Neon Serverless** | For platforms without connection pooling (Netlify, Deno Deploy, Cloudflare Workers) |

> **Note**: If you're deploying to a serverless platform that doesn't support connection pooling, the [Neon Serverless driver](https://orm.drizzle.team/docs/connect-neon) connects over HTTP (~3 roundtrips) instead of TCP (~8 roundtrips), which is faster for single queries in classic serverless environments.

---

## References

- [Drizzle PostgreSQL docs](https://orm.drizzle.team/docs/get-started-postgresql)
- [Drizzle Neon integration](https://orm.drizzle.team/docs/connect-neon)
- [Vercel Connection Pooling Guide](https://vercel.com/guides/connection-pooling-with-functions)
- [Neon + Vercel Connection Methods](https://neon.tech/docs/guides/vercel-connection-methods)
