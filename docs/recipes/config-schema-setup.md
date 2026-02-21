### Type-Safe Environment Configuration with better-env

Use `better-env/config-schema` for typed environment configuration instead of maintaining a custom local env schema utility.

### Install better-env

```bash
bun add better-env
bunx skills add neondatabase/better-env -a cursor -a codex -y
```

If you also want Neon setup guidance for agents, install:

```bash
bunx skills add neondatabase/agent-skills -a cursor -a codex -y
```

### Define feature-level config modules

Create config modules in `src/lib/*/config.ts`.

```typescript
// src/lib/db/config.ts
import { configSchema, server } from "better-env/config-schema";

export const databaseConfig = configSchema("Database", {
  url: server({ env: "DATABASE_URL" }),
});
```

Then consume values from your module instead of reading `process.env` directly:

```typescript
// src/lib/db/client.ts
import { Pool } from "pg";
import { databaseConfig } from "./config";

export const pool = new Pool({
  connectionString: databaseConfig.server.url,
});
```

### Public values and feature flags

Use `pub()` for client-safe values and `flag` when a feature is optional.

```typescript
// src/lib/sentry/config.ts
import { configSchema, pub, server } from "better-env/config-schema";

export const sentryConfig = configSchema(
  "Sentry",
  {
    token: server({ env: "SENTRY_AUTH_TOKEN" }),
    dsn: pub({
      env: "NEXT_PUBLIC_SENTRY_DSN",
      value: process.env.NEXT_PUBLIC_SENTRY_DSN,
    }),
    project: pub({
      env: "NEXT_PUBLIC_SENTRY_PROJECT",
      value: process.env.NEXT_PUBLIC_SENTRY_PROJECT,
    }),
  },
  {
    flag: {
      env: "NEXT_PUBLIC_ENABLE_SENTRY",
      value: process.env.NEXT_PUBLIC_ENABLE_SENTRY,
    },
  },
);
```

### Either-or credentials

Use `oneOf` when at least one credential must be configured.

```typescript
// src/lib/ai/config.ts
import { configSchema, oneOf, server } from "better-env/config-schema";

export const aiConfig = configSchema(
  "AI",
  {
    oidcToken: server({ env: "VERCEL_OIDC_TOKEN" }),
    gatewayApiKey: server({ env: "AI_GATEWAY_API_KEY" }),
  },
  {
    constraints: (s) => [oneOf([s.oidcToken, s.gatewayApiKey])],
  },
);
```

### Optional fields and schema validation

You can keep optional env vars and custom validation with Zod.

```typescript
import { z } from "zod";
import { configSchema, server } from "better-env/config-schema";

export const resendConfig = configSchema("Resend", {
  apiKey: server({ env: "RESEND_API_KEY" }),
  fromEmail: server({
    env: "RESEND_FROM_EMAIL",
    schema: z
      .string()
      .regex(
        /^.+\s<.+@.+\..+>$/,
        'Must match "Name <email@domain.com>" format.',
      ),
  }),
});
```

### Migrate from custom env utilities

If your project previously used a custom env schema utility, replace imports with `better-env/config-schema` and remove the custom schema implementation.
