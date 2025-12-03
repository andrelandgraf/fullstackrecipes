## Introduction

Fullstackrecipes is a Shadcn registry and collection of step-by-step guides (recipes) for building full-stack web apps and agentic applications.

---

## Recipes

Each recipe documents a complete step-by-step guide for adding a specific feature, pattern, or integration to your application. A recipe may build on top of other recipes (prerequisites) or have other requirements for your codebase such as requiring a database setup.

---

## Shadcn & Open Code

Fullstackrecipes isn't a library you install. Instead, it follows [Shadcn's Open Code philosophy](https://ui.shadcn.com/docs). By following a recipe, you copy-paste code and install dependencies to implement a feature, pattern, or integration in your codebase.

The easiest way to do this is to copy a recipe as markdown and instruct a coding agent to do the copy-paste work.

---

## Registry

Some recipe utilities can be installed directly via the fullstackrecipes Shadcn registry:

```bash
bunx shadcn@latest add https://fullstackrecipes.com/r/<item-name>.json
```

### Available Registry Items

| Item                 | Description                                                    |
| -------------------- | -------------------------------------------------------------- |
| `validate-config`    | Type-safe environment variable validation with Zod             |
| `assert`             | TypeScript assertion helper for runtime type narrowing         |
| `use-resumable-chat` | React hook for workflow-compatible chat with stream resumption |
| `durable-agent`      | AI agent class with tool loops and workflow step durability    |

### Using the Registry Namespace

You can also configure the fullstackrecipes registry as a namespace in your `components.json`:

```json
{
  "registries": {
    "@fsr": "https://fullstackrecipes.com/r/{name}.json"
  }
}
```

Then install items using the namespace:

```bash
bunx shadcn@latest add @fsr/validate-config
```

---

## Coding Style & Structure

Fullstackrecipes follows the default folder structure introduced by Shadcn (`components/`, `hooks/`, `lib/` folders) and adheres to common Next.js and full-stack TypeScript best practices.

Additionally, each recipe follows a set of patterns that I've found work well when building full-stack web apps.

### Patterns

**Everything is a library**: Organize features and domains as self-contained folders in `src/lib/` (e.g., `chat`, `ai`, `db`). Co-locate schema, queries, types, and utilities together. Components go in `components/<feature>/`.

**Use the web platform**: Prefer native APIs and standards. Avoid abstractions that hide what the code actually does.

---

## Stack

Fullstackrecipes uses an opinionated stack. Some recipes work across different frameworks and hosting providers, but following the recommended stack enables deeper integration with platform-specific APIs (Bun, Vercel Functions) and more detailed guidance.

| Category                             | Technology                   |
| ------------------------------------ | ---------------------------- |
| Frontend library                     | **React**                    |
| Full-stack framework                 | **Next.js**                  |
| ORM                                  | **Drizzle**                  |
| Agent runtime                        | **Workflow Development Kit** |
| Agent framework                      | **AI SDK**                   |
| UI components                        | **Shadcn & AI Elements**     |
| Database                             | **Neon Serverless Postgres** |
| TypeScript runtime & package manager | **Bun**                      |
| Hosting environment                  | **Vercel Fluid Compute**     |
| Auth system                          | **Better Auth**              |

---

## Getting Started

Get started by exploring the recipes. You can also sort the recipes by order and follow them from start (basic setup) to finish (workflow durable agents) to end up with a fully working application template with Stripe subscriptions, AI chat and agents, and more.
