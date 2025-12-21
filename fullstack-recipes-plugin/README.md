# Fullstack Recipes Plugin

Claude Code plugin for building AI-powered web applications with Next.js, Shadcn UI, Neon Postgres, Drizzle ORM, and AI SDK.

## Features

### Skills

Skills are automatically available to Claude for relevant tasks:

- **Environment Validation**: Validate environment variables on server start and before builds. Catch missing or invalid variables early with clear error messages.
- **Working with Drizzle**: Write type-safe database queries with Drizzle ORM. Covers select, insert, update, delete, relational queries, and adding new tables.
- **Working with Logging**: Use structured logging with Pino throughout your application. Covers log levels, context, and workflow-safe logging patterns.
- **Working with Sentry**: Capture exceptions, add context, create performance spans, and use structured logging with Sentry.
- **Working with Analytics**: Track custom events and conversions with Vercel Web Analytics. Covers common events, form tracking, and development testing.
- **Working with Authentication**: Use Better Auth for client and server-side authentication. Covers session access, protected routes, sign in/out, and fetching user data.
- **Working with Workflows**: Create and run durable workflows with steps, streaming, and agent execution. Covers starting, resuming, and persisting workflow results.

### MCP Resources

All recipes and cookbooks are available as MCP resources. Use the plugin's MCP server to access:

- Setup instructions for configuring tools and services
- Cookbooks that bundle related recipes together
- Code patterns and best practices

## Usage

Install the plugin from the marketplace or load it locally:

```bash
claude --plugin-dir ./fullstack-recipes-plugin
```

## Learn More

Visit [fullstackrecipes.com](https://fullstackrecipes.com) for the full documentation.
