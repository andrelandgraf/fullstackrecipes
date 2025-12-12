## Introduction

Fullstackrecipes is a Shadcn registry and collection of step-by-step guides (recipes) for building full-stack web apps and agentic applications.

---

## Recipes

Each recipe provides a complete step-by-step guide for adding a specific feature, pattern, or integration to your application. A recipe may build on top of other recipes (prerequisites) or have other requirements for your codebase, such as requiring a database setup. Recipes sometimes are combined into a cookbook like "Base App Setup" which includes multiple recipes to set up a base application.

---

## Shadcn & Open Code

Fullstackrecipes isn't a library you install. Instead, it follows [Shadcn's Open Code philosophy](https://ui.shadcn.com/docs). When following a recipe, you copy and paste code and install dependencies step by step into your codebase—fully owning the resulting code and free to make adjustments as you see fit. Additionally, Fullstackrecipes serves as a Shadcn registry; more information below.

---

## Coding Style & Structure

Fullstackrecipes follows common Next.js and full-stack TypeScript best practices. It adheres to the default Next.js folder structure recommended by Shadcn (`components/`, `hooks/`, `lib/` folders). Additionally, each recipe follows a set of opinionated, more custom patterns that I've found work well when building full-stack web apps.

### Patterns

**Everything is a library**: Organize features and domains as self-contained folders in `src/lib/` (e.g., `chat`, `ai`, `db`). Co-locate schema, queries, types, and utilities together. Components go in `components/<feature>/`.

**Use the web platform**: Prefer native APIs and standards. Avoid abstractions that hide what the code actually does.

---

## Stack

Fullstackrecipes uses an opinionated stack. Some recipes work across different frameworks and hosting providers, but following the recommended stack enables deeper integration with platform-specific APIs (Bun, Vercel Functions) and more detailed guidance.

| Category                             | Technology                   |
| ------------------------------------ | ---------------------------- |
| Full-stack framework                 | **Next.js**                  |
| Agent runtime                        | **Workflow Development Kit** |
| Agent framework                      | **AI SDK**                   |
| UI components                        | **Shadcn & AI Elements**     |
| ORM                                  | **Drizzle**                  |
| Database                             | **Neon Serverless Postgres** |
| TypeScript runtime & package manager | **Bun**                      |
| Hosting environment                  | **Vercel Fluid Compute**     |
| Auth system                          | **Better Auth**              |

---

## Getting Started

Get started by exploring the recipes. You can also view the recipes in order and follow them from start (basic setup) to finish (workflow durable agents) to end up with a fully working application template with Stripe subscriptions, AI chat and agents, and more.

The easiest way to follow a recipe is to instruct a coding agent to do the integration work—either by copying the recipe as markdown manually from fullstackrecipes.com or by installing the Fullstackrecipes MCP server and having your agent look up recipes by name.

### Fullstackrecipes MCP server

Add the following to your editor's MCP configuration, e.g., the `.cursor/mcp.json` file:

```json
{
  "mcpServers": {
    "fullstackrecipes": {
      "url": "https://fullstackrecipes.com/api/mcp"
    }
  }
}
```

Now, simply ask your coding agent to follow the desired recipe. For instance, ask: `Please use the Fullstackrecipes MCP server to set up AI SDK UI chat persistence with Neon`.

### Registry

Some recipe utilities can be installed directly via the fullstackrecipes Shadcn registry:

```bash
bunx shadcn@latest add https://fullstackrecipes.com/r/<item-name>.json
```

### Available Registry Items

| Item                 | Description                                                    |
| -------------------- | -------------------------------------------------------------- |
| `load-config`        | Type-safe environment variable loading with runtime protection |
| `assert`             | TypeScript assertion helper for runtime type narrowing         |
| `logger`             | Structured logging with Pino for development and production    |
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
bunx shadcn@latest add @fsr/load-config
```

---
