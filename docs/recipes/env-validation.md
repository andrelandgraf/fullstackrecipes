## Build-Time Environment Validation with better-env

Use `better-env validate` to fail fast when required environment variables are missing or invalid.

### Install and initialize

```bash
bun add better-env
bun run env:init
```

`env:init` runs `bunx --bun better-env init -y`, validates adapter prerequisites, and ensures your project is linked to the provider.

### Add validation scripts

```json
{
  "scripts": {
    "prebuild": "bun run env:validate:prod",
    "env:validate": "bunx --bun better-env validate --environment=development",
    "env:validate:prod": "bunx --bun better-env validate --environment=production"
  }
}
```

### Validate locally

```bash
bun run env:validate
bun run env:validate:prod
```

`better-env validate`:

1. Loads `.env*` files using Next.js semantics
2. Imports `src/lib/*/config.ts` modules
3. Runs `configSchema` validation in each module
4. Reports missing or invalid values
5. Warns about unused variables

### Typical fix flow

When validation fails:

1. Pull the latest variables: `bun run env:pull`
2. Re-run validation: `bun run env:validate`
3. Add/update missing values remotely via `bunx --bun better-env upsert ...`
4. Pull + validate again

This replaces custom `scripts/validate-env.ts` scripts and keeps validation logic in the `better-env` CLI.
