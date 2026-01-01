---
description: Validate environment variables on server start and before builds. Catch missing or invalid variables early with clear error messages.
---

# Environment Validation

## Implement Environment Validation

Validate environment variables on server start and before builds. Catch missing or invalid variables early with clear error messages.

**See:**

- Resource: `env-validation` in Fullstack Recipes
- URL: https://fullstackrecipes.com/recipes/env-validation

---

### Validating Configs on Server Start

Some environment variables are read internally by packages rather than passed as arguments. To catch missing variables early instead of at runtime, import your configs in `instrumentation.ts`:

```typescript
// src/instrumentation.ts
import * as Sentry from "@sentry/nextjs";
import { sentryConfig } from "./lib/sentry/config";

// Validate required configs on server start
import "./lib/ai/config";
import "./lib/db/config";

export async function register() {
  // ... initialization code
}
```

The side-effect imports trigger `configSchema` validation immediately when the server starts. If any required environment variable is missing, the server fails to start with a clear error rather than failing later when the code path is executed.

---

### Validating Environment Files Pre-Build

{% registry items="validate-env" /%}

Add the validation script to your `package.json`:

```json
{
  "scripts": {
    "prebuild": "bun run env:validate:prod",
    "env:validate": "bun run scripts/validate-env.ts --environment=development",
    "env:validate:prod": "bun run scripts/validate-env.ts --environment=production"
  }
}
```

Use the `env:validate` and `env:validate:prod` scripts to validate all your configs (`config.ts` files in `src/lib/*/`) against your `.env` files.

The `prebuild` script (configured above) runs automatically before `build`, ensuring environment variables are validated before every build (locally and in CI/Vercel). If validation fails, the build stops early with a clear error.

The script:

1. Loads `.env` files using Next.js's `loadEnvConfig` (respects the same load order as Next.js)
2. Finds all `config.ts` files in `src/lib/*/`
3. Imports each config to trigger `configSchema` validation
4. Reports any missing or invalid environment variables
5. Warns about variables defined in `.env` files but not used by any config

Example output with a validation error:

```
🔍 Environment Configuration Validator

  Environment: development

  Loading environment files...
    ✓ .env.local
    ✓ .env.development

  Found 5 config files:

  ✗ src/lib/resend/config.ts
  ✓ src/lib/sentry/config.ts
  ✓ src/lib/db/config.ts
  ✓ src/lib/ai/config.ts
  ✓ src/lib/auth/config.ts

Validation Errors:

  src/lib/resend/config.ts:
    Configuration validation error for Resend!
    Did you correctly set all required environment variables in your .env* file?
     - server.fromEmail (FROM_EMAIL) must be defined.

Summary:

  Configs validated: 4
  Validation errors: 1
  Unused env vars:   0
```

Example output with an unused variable:

```
🔍 Environment Configuration Validator

  Environment: development

  Loading environment files...
    ✓ .env.local
    ✓ .env.development

  Found 5 config files:

  ✓ src/lib/resend/config.ts
  ✓ src/lib/sentry/config.ts
  ✓ src/lib/db/config.ts
  ✓ src/lib/ai/config.ts
  ✓ src/lib/auth/config.ts

Unused Environment Variables:

  These variables are defined in .env files but not used by any config:

  ⚠ OLD_API_KEY
    defined in: .env.local

Summary:

  Configs validated: 5
  Validation errors: 0
  Unused env vars:   1
```

The script exits with code 1 if any validation errors occur (useful for CI), but unused variables only trigger warnings without failing the build.
