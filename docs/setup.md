# Template - Neon Agent Workflow Persistence

Persist AI SDK chats and messages to your Neon database.

## Stack

- Full-stack framework: **Next.js**
- ORM: **Drizzle**
- Agent runtime: **Workflow Development Kit**
- Agent framework: **AI SDK v6**
- UI components: **Shadcn & AI Elements**
- Database: **Neon Serverless Postgres**
- TypeScript runtime & package manager: **Bun**

## Getting Started

Click the "Deploy" button to clone this repository, create a new Vercel project, set up the Neon integration, and provision a new Neon database:

[![Deploy to Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fneondatabase-labs%2Fvercel-marketplace-neon%2Ftree%2Fmain&project-name=my-vercel-neon-app&repository-name=my-vercel-neon-app&products=[{%22type%22:%22integration%22,%22integrationSlug%22:%22neon%22,%22productSlug%22:%22neon%22,%22protocol%22:%22storage%22}])

Once the process is complete, you can clone the newly created GitHub repository and start making changes locally.

## Local Setup

1. Install dependencies:

```bash
bun i
```

2. Create a `.env` file in the project root

```bash
cp .env.example .env
```

3. Get your Neon database URL

Run `vercel env pull` to fetch the environment variables from your Vercel project.

Alternatively, obtain the database connection string from the Connection Details widget on the [Neon Dashboard](https://console.neon.tech/) and update the `.env` file with your database connection string:

```txt
DATABASE_URL=<your-string-here>
```

4. Get your Vercel AI Gateway API Key

Create a new Vercel AI Gateway API Key [here](https://vercel.com/ai-gateway) and add it to your `.env` file:

```txt
AI_GATEWAY_API_KEY=<your-string-here>
```

Alternatively, you can follow the [AI SDK provider docs](https://ai-sdk.dev/providers/ai-sdk-providers) and modify the model serving in the code to use a different provider instead of Vercel AI Gateway.

> **Note**: This codebase uses a type-safe config pattern with Zod validation. Environment variables are accessed via `serverConfig` instead of `process.env` directly. See `src/lib/config/` for the implementation and the [Environment Variable Management](./sections/env-config.md) recipe for details.

5. Run the development server

```bash
bun run dev
```

## Setup From Scratch

Follow these steps to integrate this setup into your existing application or to build it from scratch.

1. Create a new [Next.js](https://nextjs.org/) app

```bash
bunx create-next-app@latest
```

2. Configure Vercel to use Bun

Create a `vercel.json` file in the project root to use Bun as both the package manager and runtime on Vercel:

```json
{
  "bunVersion": "1.x"
}
```

3. Set up Shadcn

```bash
bunx --bun shadcn@latest init
bunx --bun shadcn@latest add --all
```

For details, refer to the [Shadcn Next.js docs](https://ui.shadcn.com/docs/installation/next).

Optionally, add dark mode:

```bash
bun add next-themes
```

Follow the [Shadcn Next.js dark mode guide](https://ui.shadcn.com/docs/dark-mode/next) to review all relevant code changes.

4. Set up Neon

On Vercel Fluid compute, we recommend using a pooled PostgreSQL connection that can be reused across requests (more details [here](https://neon.com/docs/guides/vercel-connection-methods)). This setup uses `node-postgres` with Drizzle as the ORM.

```bash
bun add drizzle-orm pg @vercel/functions
bun add -D drizzle-kit @types/pg
```

Follow the [Drizzle Postgres setup guide](https://orm.drizzle.team/docs/get-started/postgresql-new) for step-by-step instructions. Attach the database pool to your Vercel function to ensure it releases properly on function shutdown. For more information, see the [Vercel connection pooling guide](https://vercel.com/guides/connection-pooling-with-functions).

Optionally, configure the Neon MCP server by following the instructions in the [MCP server README](https://github.com/neondatabase/mcp-server-neon) or by running `bunx neonctl@latest init`.

5. Install AI SDK and AI Elements

Install [AI SDK v6](https://v6.ai-sdk.dev/docs/introduction):

```bash
bun add ai@beta @ai-sdk/react@beta
bunx shadcn@latest add @ai-elements/all
```

6. Create a simple chat route

Create the API route:

```typescript
// src/app/api/chat/route.ts
import { convertToModelMessages, streamText, UIMessage } from "ai";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: "anthropic/claude-sonnet-4.5",
    system: "You are a helpful assistant.",
    messages: convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
```

Create the chat page:

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
    <>
      {messages.map((message) => (
        <div key={message.id}>
          {message.role === "user" ? "User: " : "AI: "}
          {message.parts.map((part, index) =>
            part.type === "text" ? <span key={index}>{part.text}</span> : null,
          )}
        </div>
      ))}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim()) {
            sendMessage({ text: input });
            setInput("");
          }
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={status !== "ready"}
          placeholder="Say something..."
        />
        <button type="submit" disabled={status !== "ready"}>
          Send
        </button>
      </form>
    </>
  );
}
```

For status handling, error states, and more, see the [AI SDK chat docs](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot).

7. Set up Workflow Development Kit

The [Workflow Development Kit](https://useworkflow.dev) provides resumable, durable workflows for AI agents.

```bash
bun add workflow @workflow/ai
```

Update your Next.js config:

```ts
// next.config.ts
import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
};

export default withWorkflow(nextConfig);
```

Refer to the [Getting started on Next.js guide](https://useworkflow.dev/docs/getting-started/next) for detailed setup instructions.

8. Add agent rules

Create an `agents.md` file in the project root with coding guidelines for AI agents:

```md
## TypeScript

- Only create an abstraction if it's actually needed
- Prefer clear function/variable names over inline comments
- Avoid helper functions when a simple inline expression would suffice
- Don't use emojis
- No barrel index files - just export from the source files instead
- No type.ts files, just inline types or co-locate them with their related code
- Don't unnecessarily add `try`/`catch`
- Don't cast to `any`

## React

- Avoid massive JSX blocks and compose smaller components
- Colocate code that changes together
- Avoid `useEffect` unless absolutely needed

## Tailwind

- Mostly use built-in values, occasionally allow dynamic values, rarely globals
- Always use v4 + global CSS file format + shadcn/ui

## Next

- Prefer fetching data in RSC (page can still be static)
- Use next/font + next/script when applicable
- next/image above the fold should have `sync` / `eager` / use `priority` sparingly
- Be mindful of serialized prop size for RSC → child components
```

## Coding Guidelines

### TypeScript

- Only create an abstraction if it's actually needed
- Prefer clear function/variable names over inline comments
- Avoid helper functions when a simple inline expression would suffice
- No barrel index files - just export from the source files instead
- No `types.ts` files, just inline types or co-locate them with their related code
- Don't unnecessarily add `try`/`catch`
- Don't cast to `any`

### React

- Avoid massive JSX blocks and compose smaller components
- Colocate code that changes together
- Avoid `useEffect` unless absolutely needed

### Tailwind

- Mostly use built-in values, occasionally allow dynamic values, rarely globals
- Always use v4 + global CSS file format + shadcn/ui

### Next.js

- Prefer fetching data in RSC (page can still be static)
- Use `next/font` + `next/script` when applicable
- `next/image` above the fold should have `sync` / `eager` / use `priority` sparingly
- Be mindful of serialized prop size for RSC to child components

## Further Reading

For more details on the philosophy and architecture patterns used in this codebase, see the [Architecture Decisions](./sections/architecture-decisions.md) document.
