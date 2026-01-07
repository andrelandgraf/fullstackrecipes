# AI Workflow Template

A Next.js starter with resumable multi-agent workflows: durable execution, tool loops, automatic stream recovery, and chat persistence.

Template and source code for the [AI Agent Workflow](https://fullstackrecipes.com/recipes/ai-agent-workflow) cookbook on fullstackrecipes.

## Quick Start

1. **Clone and install:**

   ```bash
   npx tiged andrelandgraf/fullstackrecipes/templates/ai-workflow#main my-app
   cd my-app
   bun install
   ```

2. **Set up environment variables:**

   ```bash
   cp .env.example .env.development
   ```

   Edit `.env.development` with your:
   - Neon database URL (from [Neon Console](https://console.neon.tech))
   - Better Auth secret (generate with `openssl rand -base64 32`)
   - Resend API key (from [resend.com/api-keys](https://resend.com/api-keys))
   - AI Gateway API key or Vercel OIDC token

3. **Generate schema and run migrations:**

   ```bash
   bun run db:generate
   bun run db:migrate
   ```

4. **Start the development server:**

   ```bash
   bun run dev
   ```

## What's Included

Everything from the [Auth Template](https://fullstackrecipes.com/recipes/authentication) plus:

- **Workflow Development Kit** for durable, resumable agent execution
- **Custom Agent class** with full streamText control and tool loops
- **Resumable AI streams** that survive page refreshes and network interruptions
- **Chat persistence** with Drizzle ORM schema
- **WorkflowChatTransport** for automatic reconnection
- **Workflow-safe logging** with pino

## Pages

| Route              | Description                   |
| ------------------ | ----------------------------- |
| `/`                | Home page with links to chats |
| `/chats`           | List of user's chats          |
| `/chats/[chatId]`  | Individual chat with AI       |
| `/sign-in`         | Sign in with email/password   |
| `/sign-up`         | Create new account            |
| `/forgot-password` | Request password reset        |
| `/reset-password`  | Set new password              |
| `/verify-email`    | Verify email address          |
| `/profile`         | Account settings (protected)  |

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...all]/           # Better Auth API
│   │   └── chats/[chatId]/
│   │       └── messages/
│   │           ├── route.ts         # Start workflow endpoint
│   │           └── [runId]/stream/  # Resume stream endpoint
│   ├── chats/
│   │   ├── page.tsx                 # Chat list
│   │   └── [chatId]/page.tsx        # Chat with resumption detection
│   ├── sign-in/, sign-up/, etc.     # Auth pages
│   └── profile/                     # Account settings
├── components/
│   ├── chat/                        # Chat UI components
│   │   └── chat.tsx
│   ├── auth/                        # Auth UI components
│   └── profile/                     # Profile components
├── hooks/
│   └── use-resumable-chat.ts        # Hook with WorkflowChatTransport
├── lib/
│   ├── ai/
│   │   ├── config.ts                # AI provider config
│   │   ├── agent.ts                 # Custom durable Agent class
│   │   ├── chat-agent.ts            # Chat agent instance
│   │   └── tools.ts                 # Tool definitions
│   ├── chat/
│   │   ├── schema.ts                # Drizzle schema for chats/messages
│   │   └── queries.ts               # Database queries
│   ├── auth/                        # Auth library
│   ├── common/
│   │   ├── assert.ts
│   │   └── logger.ts                # Pino logger
│   └── db/                          # Database config
└── workflows/
    └── chat/
        ├── index.ts                 # Chat workflow
        ├── types.ts                 # Workflow types
        └── steps/
            ├── logger.ts            # Workflow-safe logger
            └── messages.ts          # Message persistence steps
```

## How Resumable Streams Work

1. **Start**: Client sends message → workflow starts → returns stream + `runId`
2. **Interrupt**: If connection drops, client stores `runId`
3. **Resume**: On reconnect, client calls resume endpoint with `runId`
4. **Recovery**: Workflow SDK replays missed chunks from checkpoint

## Key Concepts

### Workflows

Functions with `"use workflow"` directive that execute durably:

```typescript
export async function chatWorkflow({ chatId, userMessage }) {
  "use workflow";

  const history = await getMessageHistory(chatId);
  const { parts } = await agent.run(history, {
    writable: getWritable(),
  });
  await persistMessageParts(chatId, parts);
}
```

### Steps

Durable checkpoints within workflows:

```typescript
async function getMessageHistory(chatId: string) {
  "use step";
  return db.query.messages.findMany({ where: eq(messages.chatId, chatId) });
}
```

### Custom Agent

The `Agent` class provides full control over `streamText`:

```typescript
const agent = new Agent({
  stepOptions: {
    model: "gpt-4o",
    system: "You are a helpful assistant...",
    tools: "research",
  },
  streamOptions: { sendReasoning: true },
});
```

## Scripts

| Command               | Description                               |
| --------------------- | ----------------------------------------- |
| `bun run dev`         | Start development server                  |
| `bun run build`       | Build for production                      |
| `bun run db:generate` | Generate auth schema + Drizzle migrations |
| `bun run db:migrate`  | Run database migrations                   |
| `bun run db:studio`   | Open Drizzle Studio                       |

## Learn More

- [fullstackrecipes.com](https://fullstackrecipes.com) - Recipes and cookbooks
- [Workflow Development Kit](https://useworkflow.dev/docs) - Durable execution
- [AI SDK](https://sdk.vercel.ai/docs) - Vercel AI SDK
- [Better Auth](https://www.better-auth.com) - Authentication library
