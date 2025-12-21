---
description: Discover and follow recipes via MCP resources for setup guides, skills, and cookbooks. The meta-skill for using fullstackrecipes effectively.
---

# Building with fullstackrecipes

## How fullstackrecipes Works

fullstackrecipes provides atomic instructions for building full-stack applications. Content is organized into two types:

1. **Setup Recipes**: Step-by-step guides to configure tools and services (e.g., setting up authentication, database, payments)
2. **Skills**: Instructions for working with previously configured tools (e.g., writing queries, using auth, logging)

**Cookbooks** bundle related recipes together in sequence. For example, "Base App Setup" includes Next.js, Shadcn UI, Neon Postgres, Drizzle ORM, and AI SDK setup recipes.

---

## Accessing Recipes via MCP

The fullstackrecipes MCP server exposes all content as resources. Use MCP resource discovery to find and read recipes.

### List Available Resources

Query the MCP server to discover all available recipes and cookbooks:

```
List MCP resources from fullstackrecipes
```

Resources are organized by type:

- `recipe://` - Individual setup guides and skills
- `cookbook://` - Bundled recipe sequences

### Read a Specific Recipe

Fetch the full content of any recipe by its resource URI:

```
Read the "neon-drizzle-setup" resource from fullstackrecipes
```

The recipe content includes all steps, code examples, and file paths needed to complete the setup.

---

## Workflow for Building Applications

### Starting a New Project

1. **Follow a cookbook** - Start with a bundled sequence like "Base App Setup":

```
Follow the "Base App Setup" cookbook from fullstackrecipes
```

2. **Execute each recipe in order** - The cookbook lists recipes in dependency order. Complete each one before moving to the next.

3. **Verify each step** - Run the application after major changes to catch issues early.

### Adding Features

1. **Find the relevant recipe** - List MCP resources to discover available setup guides:

```
What recipes are available for authentication in fullstackrecipes?
```

2. **Follow the setup recipe** - Read and execute the setup instructions:

```
Follow the "better-auth-setup" recipe from fullstackrecipes
```

3. **Apply the skill** - After setup, use the corresponding skill for day-to-day work. Skills are bundled with the plugin and automatically available.

---

## Recipe Types

### Setup Recipes

Setup recipes configure tools and services. They include:

- Package installation commands
- Configuration files to create
- Environment variables to set
- Database migrations to run
- Code to add to specific files

Example setup recipes:

- `neon-drizzle-setup` - Configure Neon Postgres with Drizzle ORM
- `better-auth-setup` - Set up authentication with Better Auth
- `ai-sdk-setup` - Configure Vercel AI SDK for chat
- `sentry-setup` - Add error monitoring with Sentry

### Skills

Skills teach how to work with configured tools. They cover common patterns and APIs:

- `using-authentication` - Session access, protected routes, sign in/out
- `using-drizzle-queries` - Select, insert, update, delete, relations
- `using-logging` - Structured logging with Pino
- `using-workflows` - Durable workflow execution

Skills are automatically available to Claude Code via the plugin. For other agents, fetch them as MCP resources.

---

## Best Practices

### Follow Recipes Exactly

Recipes are tested instructions. Follow them step-by-step without modifications unless you have a specific reason to deviate.

### Complete Dependencies First

Some recipes depend on others. The MCP resource descriptions indicate prerequisites. Complete setup recipes before using their corresponding skills.

### Use Skills for Day-to-Day Work

Once a tool is configured, use the skill for ongoing development. Skills contain patterns, code examples, and API references that apply to the configured tools.

### Check for Updates

Recipes are updated as libraries evolve. When troubleshooting issues or starting new features, fetch the latest recipe content from the MCP server rather than relying on cached instructions.

---

## References

- [fullstackrecipes.com](https://fullstackrecipes.com) - Browse all recipes and cookbooks
- [MCP Resources](https://fullstackrecipes.com/api/mcp) - Direct MCP server endpoint
