---
name: ralph-loop
description: Run a coding agent in an autonomous loop via a /ralph slash command. A preflight check verifies every CLI is installed, linked, and authenticated, then the agent breaks a wide prompt into tasks with first-principles thinking and builds, tests, and ships each one through the dev workflow.
---

# Ralph Loop

Run a coding agent in an autonomous loop via a /ralph slash command. A preflight check verifies every CLI is installed, linked, and authenticated, then the agent breaks a wide prompt into tasks with first-principles thinking and builds, tests, and ships each one through the dev workflow.

## Prerequisites

Complete these recipes first (in order):

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

### Type-Safe Environment Configuration with better-env

Use better-env config modules for type-safe server/public env access, feature flags, and either-or credential constraints.

```bash
curl -H "Accept: text/markdown" https://fullstackrecipes.com/api/recipes/config-schema-setup
```

### Neon + Drizzle Setup

Connect a Next.js app to Neon Postgres using Drizzle ORM with optimized connection pooling for Vercel serverless functions.

```bash
curl -H "Accept: text/markdown" https://fullstackrecipes.com/api/recipes/neon-drizzle-setup
```

### Testing

Complete testing setup with Neon database branching, Playwright browser tests, integration tests, and unit tests. Isolated branches with automatic TTL cleanup.

```bash
curl -H "Accept: text/markdown" https://fullstackrecipes.com/api/recipes/testing
```

## Cookbook - Complete These Recipes in Order

### Working with the Ralph Loop

Run a coding agent in an autonomous loop via a /ralph slash command. A preflight check confirms every CLI is installed, linked, and authenticated before the agent breaks a wide prompt into tasks and builds, tests, and ships each one.

```bash
curl -H "Accept: text/markdown" https://fullstackrecipes.com/api/recipes/using-ralph-loop
```
