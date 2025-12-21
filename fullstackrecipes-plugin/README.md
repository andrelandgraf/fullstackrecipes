# Full Stack Recipes Plugin

Instructions for AI agents. Atomic setup guides and skills for auth, database, payments, and more.

## Features

### Skills

Skills are automatically available to Claude for relevant tasks:

- **Building with fullstackrecipes**: Discover and follow recipes via MCP resources for setup guides, skills, and cookbooks. The meta-skill for using this plugin effectively.
- **Environment Validation**: Validate environment variables on server start and before builds. Catch missing or invalid variables early with clear error messages.
- **Working with Drizzle**: Write type-safe database queries with Drizzle ORM. Covers select, insert, update, delete, relational queries, and adding new tables.
- **Working with Logging**: Use structured logging with Pino throughout your application. Covers log levels, context, and workflow-safe logging patterns.
- **Working with Sentry**: Capture exceptions, add context, create performance spans, and use structured logging with Sentry.
- **Working with Analytics**: Track custom events and conversions with Vercel Web Analytics. Covers common events, form tracking, and development testing.
- **Working with Authentication**: Use Better Auth for client and server-side authentication. Covers session access, protected routes, sign in/out, and fetching user data.
- **Working with Workflows**: Create and run durable workflows with steps, streaming, and agent execution. Covers starting, resuming, and persisting workflow results.

### MCP Resources

All recipes and cookbooks are available as MCP resources:

- Setup instructions for configuring tools and services
- Cookbooks that bundle related recipes together
- Code patterns and best practices

## Installation

### From Marketplace

Add the marketplace and install the plugin:

```bash
/plugin marketplace add andrelandgraf/fullstackrecipes
/plugin install fullstackrecipes@fullstackrecipes
```

### Local Development

Load the plugin directly from a local path:

```bash
claude --plugin-dir ./fullstackrecipes-plugin
```

## Learn More

Visit [fullstackrecipes.com](https://fullstackrecipes.com) for the full documentation.
