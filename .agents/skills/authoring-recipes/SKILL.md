---
name: authoring-recipes
description: Guidelines for writing fullstackrecipes recipes and cookbooks. Use when creating or editing recipe content, including installable utilities with the registry tag. For maintainers authoring recipes, not developers consuming them.
---

# Authoring Recipes

Guidelines for writing fullstackrecipes recipes and cookbooks. This skill is for maintainers writing recipes, not for developers consuming the stack (see `use-fullstackrecipes` for that).

## Recipe Tiers

Every item is one of three tiers. The tier determines what it installs and what its prose may assume.

### Tier 1 — Setup recipes (`type: "setup"`)

One-time setup that installs files, dependencies, and config for a single concern (e.g. `neon-drizzle-setup`, `better-auth-setup`).

- **Install surface stays atomic.** A setup recipe installs only its own slice so the dependency graph stays composable and individual recipes can be adopted standalone.
- **Declare prerequisites in `requires` and state them up front.** Reference the prereq; do not re-teach it. A minimal fallback for one or two missing prereqs is fine. Standalone usability lives here, not in the skill tier.

### Tier 2 — Skills (`type: "skill"`)

Day-to-day, agent-facing workflow guides for an already-configured tool (e.g. `drizzle-queries`, `authentication-best-practices`).

- **Skills are authored, not recipe docs.** The source of truth is the hand-authored `skills/<slug>/SKILL.md` (YAML frontmatter + body). The website/MCP read their body directly from that file, so edits ship as soon as they land — there is no build step. They have no `docs/recipes/<slug>.md`.
- **Name skills for what they teach, not the tool they wrap.** Use a descriptive slug and title (`drizzle-queries`, `testing-best-practices`, `ralph-loop-workflow`), not a `using-*` prefix. The `name:` frontmatter and the slug (folder name) must match, and the `# Title` H1 must match the `title` in `src/lib/recipes/data.tsx`.
- **Write for an agent, not a human tutorial.** Lead with the pattern and the code; skip hand-holding prose, "step 1/2/3" walkthroughs, and motivation paragraphs the agent already understands. Imperative, concise, example-first.
- **Assume the canonical stack. Do not hedge.** Write to the exact world the setup recipes produce. Import from the real paths (`@/lib/db/client`, `@/lib/auth/server`, `@/lib/logging/logger`, `@/components/ui/*`, etc.). Never add "if you set this up differently" caveats — that defensive framing is what dilutes a skill's value.
- The canonical stack is defined by capability, not by cookbook name: a Postgres database via Drizzle, Better Auth sessions, structured logging, shadcn/ui components, and the test harness. A skill may assume any capability its `requires` chain provides.
- **Never reference back to how the stack was set up.** A skill only teaches how to _do the thing_ at runtime. Do not name-drop the setup recipe ("set up by the X recipe", "configured in Y", "from the Z setup") — it adds nothing while the skill is running. The `requires` metadata already tracks the setup trail and is surfaced as a Prerequisites section, so the body never needs to.
- Skills are **installed via the skills CLI**, not pasted as content. They persist as agent skills for ongoing work.

### Tier 3 — Cookbooks (`isCookbook: true`)

The canonical assembled reference: an ordered, two-phase setup artifact (see below).

## Authoring Cookbooks

A cookbook is a **setup artifact**, not a reading bundle. Running a cookbook leaves the project with both the configured stack and the installed skills.

### Two-phase model

1. **Setup chain** — the setup recipes, run in order, install files/deps/config.
2. **Skill install** — the skills are installed via `bunx skills add` so the agent retains the day-to-day patterns afterward.

### Ordering

List each skill **right after its setup recipe**, not all skills at the end. The skill follows the thing it teaches you to use.

### Rendering (handled automatically)

When a cookbook is assembled, the loader branches on `type`:

- **Setup recipes** inline their full content.
- **Skill recipes** render as a compact section: `## <title>` + motivation (the description) + the `bunx skills add ... -s <slug>` command. Their content is **not** inlined — the cookbook installs them as skills.

So you do not duplicate skill content into a cookbook. Just include the skill slug in `recipes` in the right position; the install section is generated from its metadata.

## Installable Utilities

When writing recipes that include installable utilities, use the `{% registry %}` tag to provide both CLI installation and source code viewing.

### Registry Tag

The registry tag renders:

1. **Install via shadcn CLI** - A copy-able command to install the utility
2. **Source code viewer** - Collapsible code block showing the full source

Example usage:

```markdoc
{% registry items="assert" /%}
```

This renders the CLI command and source code from `public/r/assert.json`. Users can install via CLI or copy the code directly.

### Avoid Code Duplication

When using a registry tag, **do not duplicate the code** in the recipe. The registry tag handles displaying the source code automatically.

Bad:

```markdoc
{% registry items="workflow-stream" /%}

Install via the registry above, or create manually:

\`\`\`typescript
// src/workflows/steps/stream.ts
// ... same code as registry item ...
\`\`\`
```

Good:

```markdoc
{% registry items="workflow-stream" /%}

Import and use the stream utilities in your workflow:

\`\`\`typescript
import { startStream, finishStream } from "@/workflows/steps/stream";
\`\`\`
```

The registry tag already provides the installation command and source code. Only add usage examples or explanations that aren't part of the installable code itself.

---

## References

- [fullstackrecipes.com](https://fullstackrecipes.com) - Browse all recipes and cookbooks
- [MCP Resources](https://fullstackrecipes.com/api/mcp) - Direct MCP server endpoint
