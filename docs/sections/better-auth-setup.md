## Better Auth Setup

Add user authentication to your Next.js app using Better Auth with Drizzle ORM and Neon Postgres.

### MCP Server

Add the Better Auth MCP server to your `.cursor/mcp.json` for accurate API guidance:

```json
{
  "mcpServers": {
    "better-auth": {
      "url": "https://mcp.chonkie.ai/better-auth/better-auth-builder/mcp"
    }
  }
}
```

---

### Step 1: Install the package

```bash
bun add better-auth
```

### Step 2: Add environment variables

Add the secret to your `.env.development` (synced to Vercel):

```env
BETTER_AUTH_SECRET="your-random-secret-at-least-32-chars"
```

Generate a secret using:

```bash
openssl rand -base64 32
```

Add the URL to your `.env.local` (local override):

```env
BETTER_AUTH_URL="http://localhost:3000"
```

The `BETTER_AUTH_URL` differs between local (`http://localhost:3000`) and deployed environments, so it belongs in `.env.local`. On Vercel, set `BETTER_AUTH_URL` to your production URL in the dashboard.

### Step 3: Create the auth config

Create the auth config following the [Environment Variable Management](/recipes/env-config) pattern:

```typescript
// src/lib/auth/config.ts
import { loadConfig } from "../common/load-config";

export const authConfig = loadConfig({
  server: {
    secret: process.env.BETTER_AUTH_SECRET,
    url: process.env.BETTER_AUTH_URL,
  },
});
```

### Step 4: Update the generate script

Update `scripts/db/generate-schema.ts` to generate the Better Auth schema before running Drizzle migrations:

```typescript
// scripts/db/generate-schema.ts
import { $ } from "bun";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

await $`bunx @better-auth/cli@latest generate --config src/lib/auth/server.tsx --output src/lib/auth/schema.ts`;

await $`drizzle-kit generate`;
```

The Better Auth CLI generates `schema.ts` from your server config. Running it before `drizzle-kit generate` ensures your auth schema is always in sync when creating Drizzle migrations.

See [Neon + Drizzle Setup](/recipes/drizzle-with-node-postgres) for the initial script setup and `package.json` scripts.

### Step 5: Create the auth server instance

Create the auth server with basic email/password authentication:

> **Note:** We use `.tsx` instead of `.ts` to support JSX email templates when you add [Better Auth Emails](/recipes/better-auth-emails) later.

```tsx
// src/lib/auth/server.tsx
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/client";
import { authConfig } from "./config";

export const auth = betterAuth({
  secret: authConfig.server.secret,
  baseURL: authConfig.server.url,
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,
  }),
  emailAndPassword: {
    enabled: true,
  },
});
```

### Step 6: Create the API route handler

Create the catch-all route handler for auth:

```typescript
// src/app/api/auth/[...all]/route.ts
import { auth } from "@/lib/auth/server";
import { toNextJsHandler } from "better-auth/next-js";

export const { POST, GET } = toNextJsHandler(auth);
```

### Step 7: Create the auth client

Create the client-side auth hooks:

```typescript
// src/lib/auth/client.ts
"use client";

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;
```

### Step 8: Generate and run migrations

```bash
bun run db:generate
bun run db:migrate
```

---

## Usage

### Sign Up

```typescript
import { signUp } from "@/lib/auth/client";

await signUp.email({
  email: "user@example.com",
  password: "securepassword",
  name: "John Doe",
});
```

### Sign In

```typescript
import { signIn } from "@/lib/auth/client";

await signIn.email({
  email: "user@example.com",
  password: "securepassword",
});
```

### Sign Out

```typescript
import { signOut } from "@/lib/auth/client";

await signOut();
```

### Get Session (Client)

```tsx
"use client";

import { useSession } from "@/lib/auth/client";

export function UserProfile() {
  const { data: session, isPending } = useSession();

  if (isPending) return <div>Loading...</div>;
  if (!session) return <div>Not signed in</div>;

  return <div>Hello, {session.user.name}</div>;
}
```

### Get Session (Server)

```typescript
import { auth } from "@/lib/auth/server";
import { headers } from "next/headers";

export default async function Page() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return <div>Not signed in</div>;
  }

  return <div>Hello, {session.user.name}</div>;
}
```

### Protected Page Pattern

```tsx
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/server";

export default async function ProtectedPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  return <div>Welcome, {session.user.name}</div>;
}
```

---

## File Structure

```
src/lib/auth/
  config.ts    # Environment validation
  schema.ts    # Auto-generated by Better Auth CLI
  server.tsx   # Better Auth server instance (.tsx for email template support)
  client.ts    # React client hooks

src/app/api/auth/
  [...all]/route.ts  # API route handler
```

---

## Adding Social Providers

To add OAuth providers like GitHub, Google, or Vercel, first add them as fields in your auth config:

```typescript
// src/lib/auth/config.ts
import { loadConfig } from "../common/load-config";

export const authConfig = loadConfig({
  server: {
    secret: process.env.BETTER_AUTH_SECRET,
    url: process.env.BETTER_AUTH_URL,
    vercelClientId: { value: process.env.VERCEL_CLIENT_ID, optional: true },
    vercelClientSecret: {
      value: process.env.VERCEL_CLIENT_SECRET,
      optional: true,
    },
  },
});
```

Then configure them in the server:

```tsx
// src/lib/auth/server.tsx
export const auth = betterAuth({
  // ...existing config
  socialProviders: {
    ...(authConfig.server.vercelClientId &&
      authConfig.server.vercelClientSecret && {
        vercel: {
          clientId: authConfig.server.vercelClientId,
          clientSecret: authConfig.server.vercelClientSecret,
        },
      }),
  },
});
```

Here we're doing it conditionally and treat Vercel Sign In as an optional feature.

Then use on the client:

```typescript
await signIn.social({ provider: "vercel", callbackURL: "/chats" });
```

---

## References

- [Better Auth Next.js Docs](https://www.better-auth.com/docs/integrations/next)
- [Better Auth Drizzle Adapter](https://www.better-auth.com/docs/adapters/drizzle)
