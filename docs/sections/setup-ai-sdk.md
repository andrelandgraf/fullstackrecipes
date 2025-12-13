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

Create an API key at [Vercel AI Gateway](https://vercel.com/ai-gateway) and add it to your `.env.local`:

```env
AI_GATEWAY_API_KEY="your-api-key-here"
```

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

Add your API key to `.env.local`:

```env
OPENAI_API_KEY="sk-..."
# or
ANTHROPIC_API_KEY="sk-ant-..."
```

### Step 4: Create the AI config

Instead of accessing `process.env.AI_GATEWAY_API_KEY` directly, use the type-safe config pattern:

```typescript
// src/lib/ai/config.ts
import { loadConfig } from "@/lib/common/load-config";

export const aiConfig = loadConfig({
  env: {
    gatewayApiKey: "AI_GATEWAY_API_KEY",
  },
});
```

Then access via `aiConfig.gatewayApiKey` instead of `process.env.AI_GATEWAY_API_KEY`. See the [Environment Variable Management](/recipes/env-config) recipe for the full pattern.

### Step 5: Validate config on server start

Import the config in `instrumentation.ts` to validate the environment variable when the server starts:

```typescript
// src/instrumentation.ts

// Validate required configs on server start
import "./lib/ai/config";
```

This ensures the server fails immediately on startup if `AI_GATEWAY_API_KEY` is missing, rather than failing later when AI features are used.

---

## References

- [AI SDK v6 Documentation](https://v6.ai-sdk.dev/docs/introduction)
- [AI SDK Providers](https://ai-sdk.dev/providers/ai-sdk-providers)
- [Vercel AI Gateway](https://vercel.com/ai-gateway)
- [AI Elements](https://ui.shadcn.com/docs/registry/ai-elements)
