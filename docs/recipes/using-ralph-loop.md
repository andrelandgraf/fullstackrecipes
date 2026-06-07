Ralph is a pattern for long-running autonomous agent development. You give a coding agent the context, tools, and verification it needs, then run it in a loop. Each iteration breaks a wide prompt into tasks with first-principles thinking, builds each task through the dev workflow, and verifies the result before moving on.

The goal is not a special file format. It is maximizing how long the agent can run without human intervention. The loop stays autonomous only as long as the agent can plan, build, and verify on its own.

## Background & References

- [Ralph - Geoffrey Huntley](https://ghuntley.com/ralph/) - Original concept and implementation
- [Effective Harnesses for Long-Running Agents - Anthropic](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) - Engineering patterns for agent loops
- [Matt Pocock on Ralph](https://www.youtube.com/watch?v=_IK18goX4X8) - Video walkthrough

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

A wide, generic prompt is the input. The agent's own harness manages the todo list, so there is no separate user-story file to author or check off. The durable record of intent lives in the artifacts the agent produces: tests (executable acceptance criteria), user-facing docs, and a changelog for publishable libraries.

---

## What the Agent Needs

The prerequisites already provide everything the loop depends on. There is nothing Ralph-specific to install.

### Context

The agent needs to know how to work in this codebase: patterns, the dev workflow, and conventions. This is set up by the **AI Coding Agent Configuration** recipe (`AGENTS.md`, MCP servers, skills).

### Tools

The agent needs to interact with infrastructure: provision resources, run migrations, pull logs, and inspect deployments. MCP servers and CLIs from the agent setup cover this. Give the agent the same tools you use.

### Verification

Verification is what extends autonomous runway. The agent needs to check its own work both locally and in production:

- **Code health** - `bun run typecheck`, `bun run fmt`, `bun run fallow`
- **Tests** - `bun run test` against an isolated database branch (Playwright, integration, unit)
- **Browser** - `agent-browser` to interact with the running app like a user
- **Logs & deploys** - pull deployment and runtime logs to confirm changes shipped and work in production

If verification is trustworthy and self-serve, the agent can catch and fix its own regressions without a human in the loop.

---

## As a Slash Command

Run the loop as a `/ralph` slash command. Invoking it with no argument prompts you for the wide prompt, then runs the preflight check before any work begins.

Create `.cursor/commands/ralph.md` (or your agent's equivalent command directory):

```markdown
---
description: Run the autonomous Ralph loop with a preflight infra check
argument-hint: [wide outcome-focused prompt]
---

The user's prompt is: $ARGUMENTS

If the prompt above is empty, STOP and ask the user:
"What outcome do you want the Ralph loop to drive toward? Give me a wide,
outcome-focused prompt and I'll break it into tasks."
Wait for their answer before continuing.

Then follow the **Working with the Ralph Loop** recipe:

1. Run the Preflight Check. If anything is missing or unauthenticated, report
   it with the exact fix commands and STOP. Do not start the loop until the
   user confirms everything is green.
2. Once preflight passes, run the loop until no tasks remain and all
   verification passes.
```

Claude Code and other agents use `.claude/commands/` or `commands/`; mirror the same file there. The body is plain instructions, so it ports across agents unchanged.

---

## Preflight Check

Before the first iteration, the agent confirms it actually has everything it needs. This avoids burning iterations only to discover halfway through that it can't reach the database or deploy.

The agent does not assume a fixed list. It infers the active infrastructure from the codebase, then checks each tool:

1. **Discover the infra in use.** Read the MCP server config (`.cursor/mcp.json`), the env config modules (`better-env` `configSchema` declarations), and `package.json` scripts. Each configured service implies a CLI or token that must work: Neon (`DATABASE_URL`), Vercel, Resend, Sentry, GitHub, Better Auth, etc.
2. **For each tool, verify install + link + auth** with a non-destructive command.
3. **Report the results** as a checklist, with a fix command for every red item.

Example checks (only run the ones the codebase actually uses):

```bash
# Browser automation
agent-browser -v

# Vercel: installed + linked + authenticated
vercel --version && vercel whoami && vercel project ls

# Neon: CLI authenticated, and the DB is reachable
neonctl me && psql "$DATABASE_URL" -c "select 1"

# Resend / Sentry / Stripe: token present and valid
test -n "$RESEND_API_KEY" && echo "resend token set"
test -n "$SENTRY_AUTH_TOKEN" && sentry-cli info

# GitHub CLI (for PRs, logs)
gh auth status

# Env vars validate against the schema
bun run env:validate
```

The agent reports a checklist and stops if anything is red:

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

For anything that needs interactive OAuth (Vercel, Neon, GitHub), the agent gives you the exact command to run yourself — it does not try to complete a browser login on your behalf. For anything fixable non-interactively (pulling env vars, setting a token), it offers to run the command for you.

Only once every item is green does the loop start. At that point the agent knows it can build, migrate, test, deploy, and read logs without getting stuck on a missing credential.

---

## Running the Loop

Give your agent a wide prompt. It runs the preflight check once, then works through the loop. Each iteration:

1. Reads the current state of the codebase and any prior progress.
2. Breaks the remaining work into tasks using first-principles thinking.
3. Picks the highest-priority task.
4. Implements it through the dev workflow: write tests, build, generate and migrate DB schema if needed, format.
5. Verifies: typecheck, build, tests, and browser interaction at `http://localhost:3000`.
6. Debugs and fixes until verification passes.
7. Updates user-facing docs and the changelog for any published artifacts.
8. Commits with a descriptive message and moves to the next task.

The dev server should be running (`bun run dev`). The agent works against a test database, so it can migrate freely.

The loop ends when no tasks remain and all verification passes.

---

## Steering the Loop

Keep the input prompt wide and outcome-focused, then let the agent decompose it. Add direction by sharpening the prompt or by tightening verification:

- **Sharper prompt** - state the outcome and constraints, not the steps.
- **Stronger tests** - failing tests are the most reliable signal the agent has more work to do.
- **Better tools** - if the agent keeps getting stuck on a task, it is usually missing a tool (an MCP server, a CLI, log access) rather than missing instructions.
