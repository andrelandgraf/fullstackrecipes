---
name: ralph-loop-workflow
description: Run a coding agent in an autonomous loop via a /ralph command, gated by a preflight check that every CLI is installed, linked, and authenticated. Use when driving long-running autonomous development from a wide, outcome-focused prompt.
---

# Ralph Loop Workflow

Run a coding agent in an autonomous loop that breaks a wide prompt into tasks and builds, tests, and ships each one.

## Prerequisites

Complete these setup recipes first:

- AI Coding Agent Configuration
- Code Health, Linting & Formatting
- Testing

### The Loop

Ralph maximizes how long the agent runs without human intervention. The goal is not a file format — it is keeping the agent able to plan, build, and verify on its own. The durable record of intent lives in the artifacts the agent produces: tests (executable acceptance criteria), user-facing docs, and a changelog for published libraries.

```
input prompt
  -> preflight check (CLIs installed, linked, authenticated)
  -> agent harness managed todo list (first-principles task breakdown)
  -> code + user-facing docs + changelog + tests
  -> verification (typecheck, fmt, fallow, browser, tests, deploy, prod check)
  -> iterate
```

Give the agent a wide, outcome-focused prompt and let its own harness manage the todo list — there is no separate user-story file to author or check off.

If no prompt is given, STOP and ask the user: "What outcome do you want the Ralph loop to drive toward? Give me a wide, outcome-focused prompt and I'll break it into tasks." Wait for their answer before continuing.

Run the preflight check once. If anything is missing or unauthenticated, report the exact fix commands and STOP — the loop does not start until everything is green. Then each iteration:

1. Read the current state of the codebase and any prior progress.
2. Break remaining work into tasks with first-principles thinking.
3. Pick the highest-priority task.
4. Implement it through the dev workflow: write tests, build, generate and migrate DB schema if needed, format.
5. Verify: typecheck, build, tests, and browser interaction at `http://localhost:3000`.
6. Debug and fix until verification passes.
7. Update user-facing docs and the changelog for any published artifacts.
8. Commit with a descriptive message and move to the next task.

Keep the dev server running (`bun run dev`). The agent works against a test database, so it can migrate freely. The loop ends when no tasks remain and all verification passes.

### What the Agent Needs

Nothing Ralph-specific to install — the loop depends on three things being in place:

- **Context** — how to work in this codebase (patterns, dev workflow, conventions), via `AGENTS.md`, configured MCP servers, and installed skills.
- **Tools** — to provision resources, run migrations, pull logs, and inspect deployments, via the project's MCP servers and CLIs. Give the agent the same tools you use.
- **Verification** — what extends autonomous runway. The agent must check its own work locally and in production:
  - **Code health** — `bun run typecheck`, `bun run fmt`, `bun run fallow`
  - **Tests** — `bun run test` against an isolated database branch (Playwright, integration, unit)
  - **Browser** — `agent-browser` to interact with the running app like a user
  - **Logs & deploys** — pull deployment and runtime logs to confirm changes shipped and work in production

When verification is trustworthy and self-serve, the agent catches and fixes its own regressions without a human in the loop.

### Preflight Check

Confirm the agent has everything before the first iteration, rather than discovering a missing credential halfway through. Don't assume a fixed list — infer the active infrastructure from the codebase, then check each tool:

1. **Discover the infra in use.** Read the MCP config (`.cursor/mcp.json`), the `better-env` `configSchema` declarations, and `package.json` scripts. Each configured service implies a CLI or token: Neon (`DATABASE_URL`), Vercel, Resend, Sentry, GitHub, Better Auth, etc.
2. **For each tool, verify install + link + auth** with a non-destructive command.
3. **Report a checklist** with a fix command for every red item.

Example checks (run only the ones the codebase uses):

```bash
agent-browser -v                                      # browser automation
vercel --version && vercel whoami && vercel project ls # installed + linked + auth
neonctl me                                            # Neon CLI authenticated
sentry-cli info                                       # token present and valid
gh auth status                                        # GitHub CLI for PRs, logs
bun run env:validate                                  # env vars match the schema
```

Stop if anything is red:

```
Preflight check
  [ok]   agent-browser            v1.4.2
  [ok]   vercel                   linked to acme/app, logged in as andre
  [fail] neon                     not authenticated
  [fail] DATABASE_URL             not set in .env.local
  [ok]   gh                       authenticated

2 issues block the loop. Run these, then re-run /ralph:

  neonctl auth                      # opens browser for OAuth
  bun run env:pull                  # pull DATABASE_URL from Vercel
```

For interactive OAuth (Vercel, Neon, GitHub), give the user the exact command to run themselves — don't attempt a browser login on their behalf. For anything fixable non-interactively (pulling env vars, setting a token), offer to run it. Start the loop only once every item is green.

### Steering the Loop

Keep the prompt wide and outcome-focused, then let the agent decompose it. Add direction by sharpening inputs, not micromanaging steps:

- **Sharper prompt** — state the outcome and constraints, not the steps.
- **Stronger tests** — failing tests are the most reliable signal that more work remains.
- **Better tools** — when the agent keeps getting stuck, it usually lacks a tool (an MCP server, CLI, or log access), not instructions.

### Background & References

- [Ralph - Geoffrey Huntley](https://ghuntley.com/ralph/) - Original concept and implementation
- [Effective Harnesses for Long-Running Agents - Anthropic](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) - Engineering patterns for agent loops
- [Matt Pocock on Ralph](https://www.youtube.com/watch?v=_IK18goX4X8) - Video walkthrough
