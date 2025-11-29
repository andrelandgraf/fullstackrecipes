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

### Step 4: Add to your config (recommended)

Instead of accessing `process.env.AI_GATEWAY_API_KEY` directly, use the type-safe config pattern. Create `src/lib/ai/config.ts`:

```typescript
import { z } from "zod";
import { validateConfig, type PreValidate } from "../config/utils";

const AIConfigSchema = z.object({
  gatewayApiKey: z.string("AI_GATEWAY_API_KEY must be defined."),
});

export type AIConfig = z.infer<typeof AIConfigSchema>;

const config: PreValidate<AIConfig> = {
  gatewayApiKey: process.env.AI_GATEWAY_API_KEY,
};

export const aiConfig = validateConfig(AIConfigSchema, config);
```

Then access via `serverConfig.ai.gatewayApiKey` instead of `process.env.AI_GATEWAY_API_KEY`. See the [Environment Variable Management](/recipes/env-config) recipe for the full pattern.

---

## References

- [AI SDK v6 Documentation](https://v6.ai-sdk.dev/docs/introduction)
- [AI SDK Providers](https://ai-sdk.dev/providers/ai-sdk-providers)
- [Vercel AI Gateway](https://vercel.com/ai-gateway)
- [AI Elements](https://ui.shadcn.com/docs/registry/ai-elements)
