## Architecture Decisions

This document outlines the philosophy and patterns that guide this codebase.

---

## Everything is a Library

Every feature, infrastructure service, and domain concept is organized as a self-contained folder in `src/lib/` following npm package naming conventions (e.g., `chat`, `ai`, `recipes`).

### Structure

```
src/lib/
  ai/             # AI/LLM utilities
    agent.ts
    config.ts     # AI environment config
    tools.ts
  chat/           # Chat feature library
    schema.ts     # Database schema
    queries.ts    # Database queries
  config/         # Centralized configuration
    server.ts     # Aggregates all module configs
    utils.ts      # Zod validation helpers
  db/             # Database infrastructure
    client.ts     # Connection pool
    config.ts     # Database environment config
    schema.ts     # Re-exports all schemas
  recipes/        # Recipe feature
    data.tsx
    loader.ts
```

### Principles

**Colocation**: Code that changes together stays together. A feature's schema, queries, types, and utilities live in the same folder.

**Dependencies flow inward**: Libraries can depend on each other. Feature libraries (like `chat`) depend on infrastructure libraries (like `db`). Infrastructure libraries don't depend on feature libraries.

**No barrel files**: Export directly from source files. Import what you need from the specific file, not from an index.

**Flat structure**: Avoid deep nesting. A library folder should be shallow - if it needs subdirectories, consider whether it should be split into multiple libraries.

### Example: Chat Library

```
src/lib/chat/
  schema.ts    # Drizzle table definitions + types
  queries.ts   # Database operations
```

The chat library owns everything related to chat persistence. Components and API routes import from `@/lib/chat/queries` and `@/lib/chat/schema`.

### Example: Config Library

```
src/lib/config/
  server.ts    # Aggregates all module configs into serverConfig
  utils.ts     # PreValidate type, InvalidConfigurationError, validateConfig()
```

Each feature library that needs environment variables defines its own `config.ts` (e.g., `db/config.ts`, `ai/config.ts`). The central `config/server.ts` imports and re-exports them all as `serverConfig`. See the [Environment Variable Management](/recipes/env-config) recipe for details.

---

## Coding Guidelines

This codebase includes an `agents.md` file at the project root. This file is intended to be used as context for AI coding assistants (like Cursor, GitHub Copilot, or similar tools).

Copy this into your project root or AI assistant configuration:

```markdown
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

---

## Why This Matters

This structure optimizes for:

1. **Discoverability**: Find all chat-related code in one place
2. **Changeability**: Modify a feature without hunting across the codebase
3. **Deletability**: Remove a feature by deleting its folder
4. **Testability**: Test a library in isolation

When adding a new feature, create a new library folder. When a file doesn't fit an existing library, that's a signal to create a new one.
