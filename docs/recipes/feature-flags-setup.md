## Overview

The Flags SDK is a free, open-source library for implementing feature flags and A/B tests. It works with any flag provider or custom setup and is compatible with App Router, Pages Router, and Middleware.

**Key benefits:**

- Server-side evaluation (no client-side flash)
- Works with the Vercel Toolbar's Flags Explorer
- Type-safe flag definitions
- Zero dependencies on external services

## Installation

```bash
bun add flags
```

## Declaring Feature Flags

Create a flags file in the relevant lib folder. Each domain can manage its own flags:

```ts
// src/lib/auth/flags.ts
import { flag } from "flags/next";

export const vercelSignInFlag = flag({
  key: "vercel-sign-in",
  decide() {
    // Enable when environment variables are configured
    return Boolean(
      process.env.VERCEL_CLIENT_ID && process.env.VERCEL_CLIENT_SECRET,
    );
  },
});
```

The `decide()` function runs on the server and determines the flag's value. You can use:

- Environment variables
- User session data
- Random assignment for A/B tests
- External flag providers

## Using Flags in Server Components

Call the flag function directly in your page or component:

```tsx
// src/app/sign-in/page.tsx
import { vercelSignInFlag } from "@/lib/auth/flags";

export default async function SignInPage() {
  const showVercelSignIn = await vercelSignInFlag();

  return (
    <main>
      <SignIn showVercelSignIn={showVercelSignIn} />
    </main>
  );
}
```

## Passing Flags to Client Components

Since flags are evaluated server-side, pass the resolved value as a prop:

```tsx
// Client component receives the flag value as a prop
export function SignIn({ showVercelSignIn }: { showVercelSignIn: boolean }) {
  return (
    <div>
      {showVercelSignIn && (
        <Button onClick={handleVercelSignIn}>Sign in with Vercel</Button>
      )}
      {/* Rest of the form */}
    </div>
  );
}
```

## Flag Patterns

### Environment-Based Flags

Enable features based on environment configuration:

```ts
export const stripeFlag = flag({
  key: "stripe-enabled",
  decide() {
    return Boolean(process.env.STRIPE_SECRET_KEY);
  },
});
```

### Flags with Validated Config

For flags that depend on validated environment variables, combine with the [loadConfig](/recipes/env-management) pattern. Create a config file that uses the feature flag pattern:

```ts
// src/lib/stripe/config.ts
import { loadConfig } from "@/lib/common/load-config";

export const stripeConfig = loadConfig({
  name: "Stripe",
  flag: process.env.ENABLE_STRIPE, // Only validate when flag is set
  server: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },
});
// Type: FeatureConfig<...>
```

Then create a flag that checks the config:

```ts
// src/lib/stripe/flags.ts
import { flag } from "flags/next";
import { stripeConfig } from "./config";

export const stripeFlag = flag({
  key: "stripe-enabled",
  decide() {
    return stripeConfig.isEnabled;
  },
});
```

This approach validates all required env vars when the feature is enabled, giving clear error messages if any are missing.

### Percentage Rollout

Gradually roll out features to a percentage of users:

```ts
export const newFeatureFlag = flag({
  key: "new-feature",
  decide() {
    return Math.random() < 0.1; // 10% of requests
  },
});
```

### User-Based Flags

Enable features for specific users (requires session context):

```ts
export const betaFeatureFlag = flag({
  key: "beta-feature",
  async decide({ headers }) {
    // Access user session from headers if needed
    const session = await getSession(headers);
    return session?.user?.email?.endsWith("@mycompany.com") ?? false;
  },
});
```

## Flags Explorer (Vercel Toolbar)

When deployed to Vercel, the [Flags Explorer](https://vercel.com/docs/workflow-collaboration/feature-flags/flags-explorer) in the Vercel Toolbar lets you override flags for your session without affecting other users.

This is useful for:

- Testing feature states without changing configuration
- QA testing different flag combinations
- Debugging flag-dependent behavior

The Flags SDK automatically respects overrides set by the Flags Explorer.

## Project Structure

Organize flags by domain, colocated with related code and config:

```
src/lib/
├── auth/
│   ├── config.ts     # Auth environment config
│   ├── flags.ts      # Auth-related flags
│   ├── client.ts
│   └── server.tsx
├── stripe/
│   ├── config.ts     # Stripe environment config (with flag)
│   ├── flags.ts      # Stripe-related flags
│   └── client.ts
└── common/
    └── load-config.ts  # Shared config loader
```

## References

- [Flags SDK Documentation](https://flags-sdk.dev)
- [Next.js Integration](https://flags-sdk.dev/frameworks/next)
- [Vercel Flags Explorer](https://vercel.com/docs/workflow-collaboration/feature-flags/flags-explorer)
- [Vercel Toolbar](https://vercel.com/docs/workflow-collaboration/vercel-toolbar)
