## AI Coding Agent Configuration

This guide helps you configure AI coding agents (like Cursor, GitHub Copilot, Claude Code, or similar tools) to follow consistent patterns when working with your codebase.

### Step 1: Create an agents.md file

Create an `agents.md` file in your project root. This file provides coding guidelines and patterns for AI assistants to follow.

```markdown
# Patterns

- Everything is a library: Organize features and domains as self-contained folders in `src/lib/` (e.g., `chat`, `ai`, `db`). Co-locate schema, queries, types, and utilities together. Components go in `components/<feature>/`.
- Use the web platform: Prefer native APIs and standards. Avoid abstractions that hide what the code actually does.

# Coding Guidelines

## Runtime and Package Manager

- Use Bun instead of Node.js, npm, pnpm, or vite.
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`.
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`.
- Bun automatically loads .env, so don't use dotenv.

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

> This `agents.md` file is based on [Lee Robinson's](https://x.com/leerob) original [shared here](https://x.com/leerob/status/1993162978410004777).

### Step 2: Configure MCP Servers

Fullstackrecipes recommends using MCP (Model Context Protocol) servers to enhance your coding agent's capabilities. Different recipes may introduce additional MCP servers. For now, start by adding these to your `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "next-devtools": {
      "command": "npx",
      "args": ["-y", "next-devtools-mcp@latest"]
    },
    "context7": {
      "url": "https://mcp.context7.com/mcp"
    },
    "better-auth": {
      "url": "https://mcp.chonkie.ai/better-auth/better-auth-builder/mcp"
    },
    "resend": {
      "url": "https://resend.com/docs/mcp"
    },
    "fullstackrecipes": {
      "url": "http://fullstackrecipes.com/api/mcp"
    }
  }
}
```

| Server             | Description                                                      |
| ------------------ | ---------------------------------------------------------------- |
| `next-devtools`    | Next.js development tools for debugging, routing, and build info |
| `context7`         | Up-to-date documentation lookup for any library                  |
| `better-auth`      | Better Auth framework documentation and API reference            |
| `resend`           | Resend email API documentation and examples                      |
| `fullstackrecipes` | Fullstackrecipes recipes                                         |

> **Note:** Remove any MCP servers for tools you don't plan to use in your project. For example, if you're not using Better Auth for authentication, remove the `better-auth` entry.

---

## References

- [Cursor Rules Documentation](https://docs.cursor.com/context/rules-for-ai)
- [GitHub Copilot Instructions](https://docs.github.com/en/copilot/customizing-copilot/adding-repository-custom-instructions-for-github-copilot)
