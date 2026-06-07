---
name: using-ralph-loop
description: Run a coding agent in an autonomous loop via a /ralph slash command. A preflight check confirms every CLI is installed, linked, and authenticated before the agent breaks a wide prompt into tasks and builds, tests, and ships each one.
---

# Working with the Ralph Loop

Run a coding agent in an autonomous loop. Give it context, tools, and verification, then let it break a wide prompt into tasks and build, test, and ship each one end to end.

**See:**

- Resource: `using-ralph-loop` in Fullstack Recipes
- URL: https://fullstackrecipes.com/recipes/using-ralph-loop

---

## The Loop

```
input prompt
  -> preflight check (CLIs installed, linked, authenticated)
  -> agent harness managed todo list (first-principles task breakdown)
  -> code + user-facing docs + changelog + tests
  -> verification (typecheck, fmt, fallow, browser, tests, deploy, prod check)
  -> iterate
```

The goal is maximizing how long the agent runs without human intervention. There is no user-story file to author or check off; the agent's harness manages its own todo list. Durable intent lives in tests (executable acceptance criteria), user-facing docs, and a changelog for publishable libraries.

## As a Slash Command

Run the loop as a `/ralph` slash command (`.cursor/commands/ralph.md`, or `.claude/commands/` for Claude Code). Invoking it with no argument prompts for the wide prompt, then runs the preflight check before any work begins. The command body is plain instructions: capture `$ARGUMENTS`, ask for the prompt if empty, run the preflight, then run the loop once green.

## Preflight Check

Before the first iteration, confirm the agent has everything it needs so it does not stall mid-loop on a missing credential. Do not assume a fixed list — infer the active infra from the codebase, then check each tool:

1. **Discover infra** from `.cursor/mcp.json`, the `better-env` `configSchema` modules, and `package.json` scripts (Neon/`DATABASE_URL`, Vercel, Resend, Sentry, GitHub, etc.).
2. **Verify install + link + auth** for each with a non-destructive command (`agent-browser -v`, `vercel whoami`, `neonctl me`, `psql "$DATABASE_URL" -c "select 1"`, `gh auth status`, `bun run env:validate`).
3. **Report a checklist** and stop if anything is red, giving the exact fix command for each. For interactive OAuth (Vercel, Neon, GitHub), hand the user the command to run themselves; for non-interactive fixes (pulling env vars, setting a token), offer to run it. Only start the loop once every item is green.

## What the Agent Needs

- **Context** - patterns, dev workflow, and conventions from the AI Coding Agent Configuration recipe (`AGENTS.md`, MCP servers, skills).
- **Tools** - MCP servers and CLIs to provision resources, run migrations, pull logs, and inspect deployments.
- **Verification** - the real moat. Code health (`typecheck`, `fmt`, `fallow`), tests against an isolated DB branch, `agent-browser` for the running app, and log/deploy access to confirm changes shipped.

## Running the Loop

Give a wide, outcome-focused prompt and let the agent decompose it. Each iteration: read state, break into tasks, pick the highest priority, implement through the dev workflow, verify locally and in production, fix until green, update docs/changelog, commit, repeat. Keep `bun run dev` running; the agent works against a test database and can migrate freely. The loop ends when no tasks remain and all verification passes.

## Steering the Loop

- **Sharper prompt** - state the outcome and constraints, not the steps.
- **Stronger tests** - failing tests are the most reliable signal there is more work to do.
- **Better tools** - if the agent keeps getting stuck, it is usually missing a tool, not instructions.
