# Fullstack Recipe Template

The complete [fullstackrecipes.com](https://fullstackrecipes.com) stack in a single Next.js starter: authentication, AI chat with durable resumable workflows, Stripe subscriptions, typed environment config, Postgres + Drizzle, logging, error monitoring, analytics, feature flags, and a full test setup.

## Quick Start

1. **Clone and install:**

   ```bash
   npx tiged andrelandgraf/fullstackrecipes/templates/fullstackrecipe#main my-app
   cd my-app
   bun install
   ```

2. **Set up environment variables:**

   ```bash
   cp .env.example .env.development
   ```

   Fill in the values (see `.env.example` for the full list and comments):
   - Neon database URL (from [Neon Console](https://console.neon.tech))
   - Better Auth secret (`openssl rand -base64 32`)
   - Resend API key (from [resend.com/api-keys](https://resend.com/api-keys))
   - AI Gateway API key or Vercel OIDC token
   - Stripe keys + webhook secret (optional, for billing)
   - Sentry DSN/org/project (optional, for monitoring)

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

| Capability        | Stack                                                      |
| ----------------- | ---------------------------------------------------------- |
| Framework         | Next.js 16 (App Router) + React Compiler                   |
| UI                | Tailwind v4 + shadcn/ui + next-themes                      |
| Auth              | Better Auth (email/password, verification, profile)        |
| Database          | Neon Postgres + Drizzle ORM (node-postgres pool)           |
| AI                | AI SDK v6 + ai-elements + Vercel AI Gateway                |
| Durable execution | Workflow Development Kit (resumable AI streams)            |
| Payments          | Stripe subscriptions with webhook sync                     |
| Email             | Resend + React Email                                       |
| Typed config      | better-env config schema + validation                      |
| Logging           | pino (workflow-safe)                                       |
| Monitoring        | Sentry (server, edge, client, pino integration)            |
| Analytics         | Vercel Web Analytics                                       |
| Feature flags     | Flags SDK                                                  |
| URL state         | nuqs                                                       |
| OG images         | `next/og` opengraph-image convention                       |
| Testing           | bun:test (unit + integration) + Playwright + Neon branches |

## Pages

| Route              | Description                       |
| ------------------ | --------------------------------- |
| `/`                | Branded home with theme toggle    |
| `/chats`           | List of the user's chats          |
| `/chats/[chatId]`  | Individual chat with the AI agent |
| `/settings`        | Subscription + usage (Stripe)     |
| `/profile`         | Account settings (protected)      |
| `/sign-in`         | Sign in with email/password       |
| `/sign-up`         | Create a new account              |
| `/forgot-password` | Request a password reset          |
| `/reset-password`  | Set a new password                |
| `/verify-email`    | Verify an email address           |

## Scripts

| Command                    | Description                               |
| -------------------------- | ----------------------------------------- |
| `bun run dev`              | Start the development server              |
| `bun run dev:stripe`       | Forward Stripe webhooks (local)           |
| `bun run build`            | Build for production                      |
| `bun run typecheck`        | Type-check the project                    |
| `bun run fmt`              | Format with Prettier                      |
| `bun run fallow`           | Code-health analysis                      |
| `bun run db:generate`      | Generate auth schema + Drizzle migrations |
| `bun run db:migrate`       | Run database migrations                   |
| `bun run db:studio`        | Open Drizzle Studio                       |
| `bun run test`             | Run all tests on an isolated Neon branch  |
| `bun run test:unit`        | Run unit tests                            |
| `bun run test:integration` | Run integration tests                     |
| `bun run test:playwright`  | Run Playwright tests                      |
| `bun run env:validate`     | Validate environment variables            |

## Learn More

- [fullstackrecipes.com](https://fullstackrecipes.com) — recipes and cookbooks
- [Workflow Development Kit](https://useworkflow.dev/docs) — durable execution
- [AI SDK](https://sdk.vercel.ai/docs) — Vercel AI SDK
- [Better Auth](https://www.better-auth.com) — authentication
- [Drizzle ORM](https://orm.drizzle.team) — TypeScript ORM
