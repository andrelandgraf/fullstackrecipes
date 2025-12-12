# Recipe Review TODOs

## Goal

Every recipe should be **complete** and **fully match** the demo code in this app.

For example, the `sentry-setup` recipe's code examples should produce the exact same code as what exists in `src/lib/sentry/`, `next.config.ts`, `src/instrumentation.ts`, `src/instrumentation-client.ts`, etc.

### Requirements

1. **All code must be explicitly listed** - A coding agent reading the markdown should be able to 1-to-1 replicate the recipe
2. **Match demo implementation** - The recipe output should match the actual implementation in this codebase
3. **Include all related files** - Don't forget config files, instrumentation files, and any other files created during setup

---

## Recipes to Review

### Cookbooks

- [ ] `base-app-setup` - Complete setup guide for Next.js with Shadcn UI, Neon Postgres, Drizzle ORM, and AI SDK
- [ ] `observability-monitoring` - Complete observability stack with logging, error tracking, and web analytics
- [ ] `ai-agent-workflow` - Multi-agent workflows with durable execution

### Individual Recipes

- [ ] `neon-drizzle-setup` - Neon + Drizzle Setup
- [ ] `shadcn-ui-setup` - Shadcn UI & Theming
- [ ] `ai-sdk-setup` - AI SDK & Simple Chat
- [ ] `pino-logging-setup` - Pino Logging Setup
- [ ] `sentry-setup` - Sentry Setup
- [ ] `vercel-analytics-setup` - Vercel Web Analytics
- [ ] `resend-setup` - Resend Setup
- [ ] `better-auth-setup` - Better Auth Setup
- [ ] `feature-flags-setup` - Feature Flags with Flags SDK
- [ ] `ai-chat-persistence` - AI Chat Persistence with Neon
- [ ] `stripe-sync` - Stripe Subscriptions DB Sync
- [ ] `workflow-setup` - Workflow Development Kit Setup
- [ ] `resumable-ai-streams` - Resumable AI Response Streams
- [ ] `custom-durable-agent` - Custom Durable Agent

---

## Review Process

1. Read the recipe markdown in `docs/sections/`
2. Compare with actual implementation in `src/`
3. Ensure all files are listed with complete code
4. Update markdown to match implementation exactly
5. Remove recipe from this list when complete
