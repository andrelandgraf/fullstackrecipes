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

The `optional` parameter creates an either-or relationship: each key is optional if the other has a value, but at least one must be defined. See the [Environment Variable Management](/recipes/env-management) recipe for the full pattern.

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

---

## Build a Simple Chat

Create a basic chat interface with streaming responses.

### Step 1: Create the API route

Create the chat API route:

```typescript
// src/app/api/chat/route.ts
import { convertToModelMessages, streamText, UIMessage } from "ai";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: "anthropic/claude-sonnet-4.5",
    system: "You are a helpful assistant.",
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
```

> **Note**: Replace the model string with your preferred model. See the [AI SDK providers docs](https://ai-sdk.dev/providers/ai-sdk-providers) for available options.

### Step 2: Create the chat page

Create the chat interface:

```tsx
// src/app/page.tsx
"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState } from "react";

export default function Page() {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
  });
  const [input, setInput] = useState("");

  return (
    <div className="flex flex-col min-h-screen p-4 max-w-2xl mx-auto">
      <div className="flex-1 space-y-4 pb-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={message.role === "user" ? "text-right" : "text-left"}
          >
            <span className="font-medium">
              {message.role === "user" ? "You" : "AI"}:
            </span>{" "}
            {message.parts.map((part, index) =>
              part.type === "text" ? (
                <span key={index}>{part.text}</span>
              ) : null,
            )}
          </div>
        ))}
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim()) {
            sendMessage({ text: input });
            setInput("");
          }
        }}
      >
        <input
          className="flex-1 px-3 py-2 border rounded-md"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={status !== "ready"}
          placeholder="Say something..."
        />
        <button
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md disabled:opacity-50"
          type="submit"
          disabled={status !== "ready"}
        >
          Send
        </button>
      </form>
    </div>
  );
}
```

### Step 3: Test your chat

Start the development server:

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) and start chatting.

---

## References

- [AI SDK Chat UI](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot)
- [AI SDK Streaming](https://ai-sdk.dev/docs/ai-sdk-core/generating-text#streaming-text)
- [useChat Hook](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat)
