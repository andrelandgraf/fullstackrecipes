### Step 1: Create an agents.md file

Create an `agents.md` file in your project root. This file provides coding guidelines and patterns for AI assistants to follow.

```markdown
// agents.md

# Patterns

- Strictly follow the Functional Core, Imperative Shell pattern: separate application logic into two parts: a functional core with pure, side-effect-free functions for business rules and data transformation, and an imperative shell that handles impure actions like database I/O, network requests, or user input, making the core logic easily testable and modular
- Everything is a library: Organize features and domains as self-contained folders in `src/lib/` (e.g., `chat`, `ai`, `db`). Co-locate schema, queries, types, and utilities together. Components go in `components/<feature>/`.
- Use the web platform: Prefer native APIs and standards. Avoid abstractions that hide what the code actually does.

# Coding Guidelines

## Runtime and Package Manager

- Use Bun instead of Node.js, npm, pnpm, or vite.
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`.
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`.

## TypeScript

- Avoid `export default` in favor of `export` whenever possible.
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

## Browser Automation

Use `agent-browser` for web automation. Run `agent-browser --help` for all commands.

Core workflow:

1. `agent-browser open <url>` - Navigate to page
2. `agent-browser snapshot -i` - Get interactive elements with refs (@e1, @e2)
3. `agent-browser click @e1` / `fill @e2 "text"` - Interact using refs
4. Re-snapshot after page changes
```

> This `agents.md` file is based on [Lee Robinson's](https://x.com/leerob) original [shared here](https://x.com/leerob/status/1993162978410004777).

### Step 2: Configure MCP Servers

Use MCP (Model Context Protocol) servers to enhance your coding agent's capabilities. Different recipes may introduce additional MCP servers. For now, start by adding these foundational MCP servers to your `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "vercel": {
      "url": "https://mcp.vercel.com"
    },
    "next-devtools": {
      "command": "npx",
      "args": ["-y", "next-devtools-mcp@latest"]
    },
    "context7": {
      "url": "https://mcp.context7.com/mcp"
    },
    "fullstackrecipes": {
      "url": "https://fullstackrecipes.com/api/mcp"
    }
  }
}
```

| Server             | Description                                                      |
| ------------------ | ---------------------------------------------------------------- |
| `vercel`           | Manage Vercel projects, deployments, and search Vercel docs      |
| `next-devtools`    | Next.js development tools for debugging, routing, and build info |
| `context7`         | Up-to-date documentation lookup for any library                  |
| `fullstackrecipes` | Fullstackrecipes recipes                                         |

> **Vercel MCP:** On first connection, Cursor will show a "Needs login" prompt. Click it to authorize access to your Vercel account. For project-specific context, use `https://mcp.vercel.com/<teamSlug>/<projectSlug>` instead.

### Step 3: Install Browser Automation

Install the `agent-browser` package globally for web automation:

```bash
bun install -g agent-browser
agent-browser install  # Download Chromium
```

### Step 4: Install Agent Skills

Install skills for AI agents:

```bash
bunx skills add anthropics/skills -s skill-creator -a opencode -a cursor -y
bunx skills add anthropics/skills -s frontend-design -a opencode -a cursor -y
bunx skills add vercel-labs/agent-skills -s web-design-guidelines -a opencode -a cursor -y
bunx skills add vercel-labs/agent-skills -s vercel-react-best-practices -a opencode -a cursor -y
bunx skills add vercel-labs/agent-browser -s agent-browser -a opencode -a cursor -y
bunx skills add vercel/ai -s ai-sdk -a opencode -a cursor -y
bunx skills add andrelandgraf/fullstackrecipes/skills -a opencode -a cursor -y
```

| Skill                         | Description                                        |
| ----------------------------- | -------------------------------------------------- |
| `agent-browser`               | Browser automation for web testing and interaction |
| `web-design-guidelines`       | Web design best practices for UI/UX                |
| `vercel-react-best-practices` | React patterns and conventions for Vercel apps     |
| `skill-creator`               | Anthropic skill creation guidelines                |
| `frontend-design`             | Anthropic frontend design best practices           |
| `ai-sdk`                      | Vercel AI SDK patterns and best practices          |
| `fullstackrecipes`            | Fullstackrecipes setup guides and workflows        |
