### Managing Environment Variables with better-env + Vercel

Use `better-env` to sync local `.env` files with Vercel environments instead of maintaining custom pull/push scripts.

### Install and configure

```bash
bun add better-env
bun run env:init
```

Create `better-env.ts` in your project root:

```typescript
import { defineBetterEnv, vercelAdapter } from "better-env";

export default defineBetterEnv({
  adapter: vercelAdapter(),
  environments: {
    development: { envFile: ".env.development", remote: "development" },
    preview: { envFile: ".env.preview", remote: "preview" },
    production: { envFile: ".env.production", remote: "production" },
    test: { envFile: ".env.test", remote: null },
  },
});
```

### Add scripts

```json
{
  "scripts": {
    "env:init": "bunx --bun better-env init -y",
    "env:pull": "bunx --bun better-env pull --environment=development",
    "env:push": "bunx --bun better-env load .env.development --environment=development --upsert",
    "env:pull:prod": "bunx --bun better-env pull --environment=production",
    "env:push:prod": "bunx --bun better-env load .env.production --environment=production --upsert"
  }
}
```

### Recommended file strategy

```text
.env.development  <- shared development values from Vercel
.env.production   <- shared production values from Vercel
.env.local        <- local-only overrides (never synced)
```

`better-env pull` writes to your configured env file and keeps `.env.local` untouched.

### Daily workflow

1. Pull shared vars: `bun run env:pull`
2. Add local overrides in `.env.local`
3. Update remote vars with `bunx --bun better-env upsert` or `bun run env:push`
4. Validate before building: `bun run env:validate`

For scripts/config files that run outside Next.js runtime (for example Drizzle config), continue using `loadEnvConfig(process.cwd())` before reading env values.
