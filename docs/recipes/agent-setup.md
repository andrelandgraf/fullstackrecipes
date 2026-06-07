### Step 1: Create an AGENTS.md file

Create an `AGENTS.md` file in your project root. This file provides coding guidelines and patterns for AI assistants to follow.

```markdown
// AGENTS.md

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
- Avoid `enum` and other TypeScript features that fail type stripping (e.g. namespaces, parameter properties); prefer `as const` objects/unions instead

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

# Dev Workflow

Follow these steps for every feature. Do not skip verification steps. Repeat the full verification flow for every additional code change.

1. Start on the latest `main` unless instructed otherwise (`git checkout main && git pull`).
2. Make the changes.
3. Run `bun run typecheck` and `bun run fmt`. Fix all type errors before moving on.
4. Verify code health with `bun run fallow`. Fix every issue (dead code, duplication, complexity, etc.) or add a `fallow-ignore` suppression if you judge the warning a false positive. Verify the codebase is clean before moving on.
5. Verify the changes with `agent-browser`. Address all UI/UX concerns before moving on. Confirm everything looks great and works.
6. Commit and push to `main`. Pushing to `main` triggers the production deploy.
7. Check deployment logs. Fix any issues and redeploy via follow-up commits if anything breaks.
8. Check production with `agent-browser` to verify the changes shipped and look good in production too. Debug any issues via app logs and fix with follow-up commits.
9. For every additional code change, go through all verification steps again.
10. Once production looks good, report all changes.
```

> This `AGENTS.md` file is based on [Lee Robinson's](https://x.com/leerob) original [shared here](https://x.com/leerob/status/1993162978410004777).

### Step 2: Symlink CLAUDE.md to AGENTS.md

Claude Code reads its instructions from `CLAUDE.md`. Create a symlink so it picks up the same guidelines from `AGENTS.md`, keeping a single source of truth:

```bash
ln -s AGENTS.md CLAUDE.md
```

### Step 3: Add MCP Servers

Use MCP (Model Context Protocol) servers to enhance your coding agent's capabilities. Add servers with `bunx add-mcp <mcp url> -y` — it updates all detected agents automatically, so no per-agent config files are required.

If no agents are detected, add `-a cursor -a codex` to the command or prompt the user to specify what agents they want to use for this project.

Add the `context7` MCP server for up-to-date documentation lookup for any library:

```bash
bunx add-mcp https://mcp.context7.com/mcp
```

### Step 4: Install Browser Automation

Install the `agent-browser` package globally for web automation:

```bash
bun install -g agent-browser
agent-browser install  # Download Chrome (first time only)
```

### Step 5: Install Agent Skills

Install skills for AI agents:

```bash
bunx skills add anthropics/skills -s skill-creator -a cursor -a codex -y
bunx skills add vercel-labs/agent-browser -s agent-browser -a cursor -a codex -y
```

| Skill           | Description                                        |
| --------------- | -------------------------------------------------- |
| `skill-creator` | Anthropic skill creation guidelines                |
| `agent-browser` | Browser automation for web testing and interaction |
