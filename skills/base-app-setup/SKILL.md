---
name: base-app-setup
description: Complete setup guide for a Next.js app with Shadcn UI, Neon Postgres, Drizzle ORM, and AI SDK.
---

# Base App Setup

Complete setup guide for a Next.js app with Shadcn UI, Neon Postgres, Drizzle ORM, and AI SDK.

## Cookbook - Complete These Recipes in Order

### Next.js on Vercel

Create a Next.js app running on Bun, configure the development environment, and deploy to Vercel with automatic deployments on push.

```bash
curl -H "Accept: text/markdown" https://fullstackrecipes.com/api/recipes/nextjs-on-vercel
```

### Code Health, Linting & Formatting

Configure Prettier for formatting, TypeScript for typechecking, and Fallow for code health (dead code, duplication, complexity, architecture drift). Skips ESLint/Biome to avoid config complexity.

```bash
curl -H "Accept: text/markdown" https://fullstackrecipes.com/api/recipes/code-health-setup
```

### AI Coding Agent Configuration

Configure AI coding agents like Cursor, GitHub Copilot, or Claude Code with project-specific patterns, coding guidelines, and MCP servers for consistent AI-assisted development.

```bash
curl -H "Accept: text/markdown" https://fullstackrecipes.com/api/recipes/agent-setup
```

### Shadcn UI & Theming

Add Shadcn UI components with dark mode support using next-themes. Includes theme provider and CSS variables configuration.

```bash
curl -H "Accept: text/markdown" https://fullstackrecipes.com/api/recipes/shadcn-ui-setup
```

### Assertion Helper

TypeScript assertion function for runtime type narrowing with descriptive error messages. Based on tiny-invariant.

```bash
curl -H "Accept: text/markdown" https://fullstackrecipes.com/api/recipes/assert
```

### Type-Safe Environment Configuration with better-env

Use better-env config modules for type-safe server/public env access, feature flags, and either-or credential constraints.

```bash
curl -H "Accept: text/markdown" https://fullstackrecipes.com/api/recipes/config-schema-setup
```

### Build-Time Environment Validation with better-env

Validate all env-backed config modules with better-env before build and in CI.

```bash
curl -H "Accept: text/markdown" https://fullstackrecipes.com/api/recipes/env-validation
```

### Neon + Drizzle Setup

Connect a Next.js app to Neon Postgres using Drizzle ORM with optimized connection pooling for Vercel serverless functions.

```bash
curl -H "Accept: text/markdown" https://fullstackrecipes.com/api/recipes/neon-drizzle-setup
```

### AI SDK & Simple Chat

Install the Vercel AI SDK with AI Elements components. Build a streaming chat interface with the useChat hook.

```bash
curl -H "Accept: text/markdown" https://fullstackrecipes.com/api/recipes/ai-sdk-setup
```

### Drizzle Queries

Write type-safe database queries with Drizzle ORM. Covers select, insert, update, delete, relational queries, and adding new tables.

```bash
bunx skills add andrelandgraf/fullstackrecipes/skills -s drizzle-queries
```
