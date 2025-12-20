### Managing Environment Variables with Vercel and Next.js

#### Environments

Vercel provides three default environments: development, preview, and production (more [here](https://vercel.com/docs/deployments/environments)).

#### Next.js Load Order

Next.js loads environment variables in the following order, stopping once each variable is found:

1. `process.env`
2. `.env.$(NODE_ENV).local`
3. `.env.local` (not checked when `NODE_ENV` is `test`)
4. `.env.$(NODE_ENV)`
5. `.env`

For example, if `NODE_ENV` is `development` and you define a variable in both `.env.development` and `.env.local`, the value in `.env.local` will be used.

> **Note**: The allowed values for `NODE_ENV` are `production`, `development`, and `test`.

Note `next build` and `next start` will use the production environment variables while `next dev` will use the development environment variables.

#### Local Development

Create a `.env.development` file for development environment variables synced from Vercel and a `.env.local` file for local development overrides.

- Use `.env.development` for development environment variables synced from Vercel.
- Override specific variables in `.env.local` for local development.
- Sync `.env.production` with Vercel to build your project locally with `next build`.

#### Syncing with Vercel

Use the Vercel CLI to keep environment variables in sync.

We write to `.env.development` (not `.env.local`) so that local overrides in `.env.local` aren't deleted when pulling from Vercel.

Add these helper scripts to your `package.json`:

```json
{
  "scripts": {
    "env:pull": "vercel env pull .env.development --environment=development",
    "env:push": "vercel env push .env.development --environment=development",
    "env:pull:prod": "vercel env pull .env.production --environment=production",
    "env:push:prod": "vercel env push .env.production --environment=production"
  }
}
```

| Script          | Purpose                                                          |
| --------------- | ---------------------------------------------------------------- |
| `env:pull`      | Download environment variables from Vercel to `.env.development` |
| `env:push`      | Upload `.env.development` to Vercel                              |
| `env:pull:prod` | Download environment variables from Vercel to `.env.production`  |
| `env:push:prod` | Upload `.env.production` to Vercel                               |

#### Local Overrides

Some variables differ between local and deployed environments (e.g., `BETTER_AUTH_URL` is `http://localhost:3000` locally). Use `.env.local` to override specific variables from `.env.development`:

```
.env.development     <- shared config from Vercel (DATABASE_URL, API keys, etc.)
.env.local           <- local overrides (BETTER_AUTH_URL, local-only settings)
```

Since `.local` files always take precedence over their non-local counterparts, your local overrides will be applied automatically.

#### Workflow

1. Run `bun run env:pull` to sync shared variables from Vercel to `.env.development`
2. Add local-only overrides to `.env.local`
3. When adding new shared variables, update `.env.development` and run `bun run env:push`

---

### Loading Environment Variables in Scripts

Scripts and config files that run outside of Next.js (like Drizzle migrations or custom build scripts) don't have environment variables automatically loaded. Use `loadEnvConfig` from `@next/env` to load them manually:

```typescript
// scripts/db/generate-schema.ts
import { $ } from "bun";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

await $`bunx @better-auth/cli@latest generate --config src/lib/auth/server.tsx --output src/lib/auth/schema.ts`;

await $`drizzle-kit generate`;
```

The same pattern applies to config files like `drizzle.config.ts`:

```typescript
// drizzle.config.ts
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { defineConfig } from "drizzle-kit";
import { databaseConfig } from "./src/lib/db/config";

export default defineConfig({
  schema: "./src/lib/*/schema.ts",
  out: "./src/lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseConfig.server.url,
  },
});
```

> **Important:** Call `loadEnvConfig` before importing any modules that access `process.env`. Environment variables must be loaded before they're read.
