## Set Up Neon Environment

Configure your Neon Postgres connection for local development.

### Step 1: Create a `.env.local` file

Create an environment file in your project root:

```bash
cp .env.example .env.local
```

### Step 2: Get your Neon database URL

**Option A: Using Vercel CLI** (if your project is connected to Vercel)

```bash
vercel env pull
```

This pulls all environment variables from your Vercel project, including the `DATABASE_URL` set by the Neon integration.

**Option B: From Neon Console**

1. Go to the [Neon Dashboard](https://console.neon.tech/)
2. Select your project
3. Copy the connection string from the **Connection Details** widget
4. Add it to your `.env.local`:

```env
DATABASE_URL="postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require"
```

> **Tip**: Use the **pooled** connection string for production workloads to improve performance and handle more concurrent connections.

### Step 3: Add to your config (recommended)

Instead of accessing `process.env.DATABASE_URL` directly, use the type-safe config pattern. Create `src/lib/db/config.ts`:

```typescript
import { z } from "zod";
import { validateConfig, type PreValidate } from "../config/utils";

const DatabaseConfigSchema = z.object({
  url: z.string("DATABASE_URL must be defined."),
});

export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;

const config: PreValidate<DatabaseConfig> = {
  url: process.env.DATABASE_URL,
};

export const databaseConfig = validateConfig(DatabaseConfigSchema, config);
```

Then access via `serverConfig.database.url` instead of `process.env.DATABASE_URL`. See the [Environment Variable Management](/recipes/env-config) recipe for the full pattern.

---

## References

- [Neon Dashboard](https://console.neon.tech/)
- [Neon Connection Strings](https://neon.tech/docs/connect/connection-string)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
