## Philosophy and Architecture Decisions

This document outlines the philosophy, patterns, and coding guidelines that guide the recipes on fullstackrecipes.com. It is a living document that will be extended over time as recipes are refined and new ones are added.

### Background and Context

I've worked on very large codebases with dozens of team members that were plagued by years of changing patterns and opinionated refactors—migrations that left half the code following the old pattern and half following another. It was fine. Some architecture decisions can have long-lasting negative effects and turn into tech debt, but most coding styles and patterns that appear isolated are fine. This is the latest code structure I enjoy following. It also makes it easy to isolate recipes into co-located files and share them via the Shadcn registry. If you disagree with what you're seeing here, it should be easy enough to copy the desired code from the recipes and have Cursor reorganize and refactor before committing it to your codebase. I hope this document provides some clarity on how I like to organize my full-stack Next.js AI apps these days.

---

## Everything is a Library

Every feature, infrastructure service, and domain concept is organized as a self-contained folder in `src/lib/` following npm package naming conventions (e.g., `chat`, `ai`, `recipes`). Every piece of code that is part of a feature or domain should be co-located in that folder. The exception is React components and hooks. These are located in `components/` and `hooks/` to follow the Shadcn default location. However, components should also be grouped in matching folder names. For instance, all `chat` feature components should be located in `components/chat` utilizing the code in `lib/chat`.

### Principles

**Colocation**: Code that changes together stays together. A feature's schema, queries, types, and utilities live in the same folder.

**Dependencies flow inward**: Libraries can depend on each other. Feature libraries (like `chat`) depend on infrastructure libraries (like `db`). Infrastructure libraries do not depend on feature libraries.

**No barrel files**: Export directly from source files. Import what you need from the specific file, not from an index.

**Flat structure**: Avoid deep nesting. A library folder should be shallow—if it needs subdirectories, consider whether it should be split into multiple libraries.

### Example: Chat Library

```
src/lib/chat/
  actions.ts   # React Server Functions
  schema.ts    # Drizzle table definitions + types
  queries.ts   # Database operations
```

The chat library owns everything related to chat persistence. Components and API routes import from `@/lib/chat/queries` and `@/lib/chat/schema`.

### Example: db Library

```
src/lib/db/
  migrations/  # Drizzle migrations folder
  client.ts    # Database client
  config.ts    # Database environment config
```

Each feature library that needs environment variables defines its own `config.ts` (e.g., `db/config.ts`, `ai/config.ts`). See the [Environment Variable Management](/recipes/env-config) recipe for details.

Each feature library that requires database persistence defines a `schema.ts` file that defines the requires database schemas. Queries are made using the `client.ts` db library client.

---

## Coding Guidelines

This codebase includes an `agents.md` file at the project root which includes further code style guidelines and patterns that the recipes follow. This file is intended to be used as context for AI coding assistants (like Cursor, GitHub Copilot, or similar tools). It is based on [this X post](https://x.com/leerob/status/1993162978410004777?s=20) by [Lee Robinson](https://x.com/leerob).

Copy this into your project root or AI assistant configuration:

```markdown
# Patterns

- Everything is a library: Organize features and domains as self-contained folders in `src/lib/` (e.g., `chat`, `ai`, `db`). Co-locate schema, queries, types, and utilities together. Components go in `components/<feature>/`.

# Coding Guidelines

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

