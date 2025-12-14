## Set Up AI SDK

Install the Vercel AI SDK and AI Elements for building AI-powered features.

### Step 1: Install AI SDK packages

```bash
bun add ai@beta @ai-sdk/react@beta
```

The `@beta` tag installs AI SDK v6, which includes the latest features and improvements.

### Step 2: Install AI Elements (optional)

AI Elements are pre-built UI components for AI interfaces:

```bash
bunx shadcn@latest add @ai-elements/all
```

This adds components like:

- Chat bubbles and message lists
- Streaming text displays
- Loading indicators
- Code blocks with syntax highlighting

### Step 3: Configure your AI provider

**Option A: Using Vercel AI Gateway**

The AI Gateway supports two authentication methods. Add one of these to your `.env.development`:

```env
AI_GATEWAY_API_KEY="your-api-key-here"
VERCEL_OIDC_TOKEN="your-oidc-token"
```

You can create an API key at [Vercel AI Gateway](https://vercel.com/ai-gateway) and add it to your `.env.development` and sync to Vercel with `bun run env:push`.

Alternatively, you can get a Vercel OIDC token by logging in via the Vercel CLI:

```bash
vercel login
```

This will prompt you to authorize the Vercel CLI to access your Vercel account. Once authorized, you can run `bun run env:pull` to sync your environment variables, which will include the Vercel OIDC token.

At least one must be set when using the AI Gateway.

**Option B: Using a specific provider**

Install the provider SDK directly:

```bash
# OpenAI
bun add @ai-sdk/openai

# Anthropic
bun add @ai-sdk/anthropic

# Google
bun add @ai-sdk/google
```

Add your API key to `.env.development`:

```env
OPENAI_API_KEY="sk-..."
# or
ANTHROPIC_API_KEY="sk-ant-..."
```

### Step 4: Create the AI config

Instead of accessing `process.env` directly, use the type-safe config pattern with either-or validation:

```typescript
// src/lib/ai/config.ts
import { loadConfig } from "@/lib/common/load-config";

export const aiConfig = loadConfig({
  server: {
    // Either oidcToken or gatewayApiKey must be set
    oidcToken: {
      value: process.env.VERCEL_OIDC_TOKEN,
      optional: "gatewayApiKey",
    },
    gatewayApiKey: {
      value: process.env.AI_GATEWAY_API_KEY,
      optional: "oidcToken",
    },
  },
});
```

The `optional` parameter creates an either-or relationship: each key is optional if the other has a value, but at least one must be defined. See the [Environment Variable Management](/recipes/env-config) recipe for the full pattern.

### Step 5: Validate config on server start

Import the config in `instrumentation.ts` to validate environment variables when the server starts:

```typescript
// src/instrumentation.ts

// Validate required configs on server start
import "./lib/ai/config";
```

This ensures the server fails immediately on startup if neither `VERCEL_OIDC_TOKEN` nor `AI_GATEWAY_API_KEY` is set, rather than failing later when AI features are used.

---

## References

- [AI SDK v6 Documentation](https://v6.ai-sdk.dev/docs/introduction)
- [AI SDK Providers](https://ai-sdk.dev/providers/ai-sdk-providers)
- [Vercel AI Gateway](https://vercel.com/ai-gateway)
- [AI Elements](https://ui.shadcn.com/docs/registry/ai-elements)
