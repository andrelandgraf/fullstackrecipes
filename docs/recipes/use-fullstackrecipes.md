## How fullstackrecipes Works

fullstackrecipes provides setup instructions for building full-stack applications and skills to work with them. Content is organized into two types:

1. **Setup Recipes** (`type: "setup"`): One-time guides to configure tools and services (e.g., setting up authentication, database, payments). Atomic installs with declared prerequisites — adoptable on their own.
2. **Skills** (`type: "skill"`, the `using-*` recipes): Day-to-day patterns for working with already-configured tools (e.g., writing queries, using auth, logging). These assume the canonical assembled stack and are **installed via the skills CLI**, not pasted as content.

**Cookbooks** are ordered, two-phase setup artifacts. Running a cookbook (1) runs its setup recipes in order, then (2) installs the corresponding `using-*` skills. After a cookbook completes, the project has both the configured stack and the installed skills. For example, "Base App Setup" sets up Next.js, Shadcn UI, Neon Postgres, Drizzle ORM, and the AI SDK, and installs the Drizzle querying skill as its final step.

---

## Accessing Recipes via MCP

The fullstackrecipes MCP server exposes all recipes and cookbooks as resources. Resources are organized by type:

- `recipe://` - Individual setup guides and skills
- `cookbook://` - Bundled recipe sequences

### Set up MCP Server

If the MCP server is not already set up, add it with:

```bash
bunx add-mcp https://fullstackrecipes.com/api/mcp -y
```

This updates all detected agents automatically. If no agents are detected, add `-a opencode -a cursor` to the command or prompt the user to specify what agents they want to use for this project.

### Install the fullstackrecipes Skill

Install the `fullstackrecipes` agent skill so your coding agent knows how to discover and follow recipes (setup guides and workflows):

```bash
bunx skills add andrelandgraf/fullstackrecipes/skills -a cursor -a codex -y
```

### List All Resources

Use the `list_resources` tool to get all available recipes and cookbooks:

```
Call the list_resources tool from fullstackrecipes
```

This returns a JSON array of all resources with their URIs, names, descriptions, and types (recipe or cookbook).

### Read a Specific Recipe

Fetch the full content of any recipe by its resource URI:

```
Read the "neon-drizzle-setup" resource from fullstackrecipes
```

The recipe content includes all steps, code examples, and file paths needed to complete the setup.

### Fallback: Fetch via curl

If the MCP server is not available, list all recipes via llms.txt:

```bash
curl https://fullstackrecipes.com/llms.txt
```

Then fetch a specific recipe as markdown:

```bash
curl -H "Accept: text/markdown" https://fullstackrecipes.com/api/recipes/<slug>

# Example: fetch the neon-drizzle-setup recipe
curl -H "Accept: text/markdown" https://fullstackrecipes.com/api/recipes/neon-drizzle-setup
```

---

## Best Practices for Following Recipes

### Follow Recipes Exactly

Recipes are tested instructions. Follow them step-by-step without modifications unless you have a specific reason to deviate.

### Complete Dependencies First

Some recipes depend on others. The MCP resource descriptions indicate prerequisites. Complete setup recipes before installing their corresponding skills.

### Install Skills, Don't Just Read Them

Skills (`using-*`) are installed via `bunx skills add ...` so your agent retains them for ongoing development. When you run a cookbook, installing its skills is the final setup step — not optional reading. Once a tool is configured, the installed skill provides the patterns, code examples, and API references for working with it. Skills assume the canonical stack is present, so install them only after their setup recipes are complete.

### Check for Updates

Recipes are updated as libraries evolve. When troubleshooting issues or starting new features, fetch the latest recipe content from the MCP server rather than relying on cached instructions.

---

## Authoring Recipes

### Recipe Tiers

Every item is one of three tiers. The tier determines what it installs and what its prose may assume.

- **Tier 1 — Setup recipes (`type: "setup"`):** One-time setup for a single concern. Keep the install surface atomic, declare prerequisites in `requires`, and reference (don't re-teach) them. Standalone usability lives here.
- **Tier 2 — Skills (`type: "skill"`, the `using-*` recipes):** Day-to-day patterns. Assume the canonical stack and do not hedge — write to the real paths the setup recipes produce (`@/lib/db/client`, `@/lib/auth/server`, `@/lib/logging/logger`, `@/components/ui/*`). The canonical stack is defined by capability (Postgres via Drizzle, Better Auth sessions, structured logging, shadcn/ui, the test harness), not by cookbook name. A skill only teaches how to _do the thing_ at runtime — never reference back to how the stack was set up (no "set up by the X recipe" name-drops); the `requires` metadata already tracks that and is surfaced as a Prerequisites section. Skills are installed via the skills CLI.
- **Tier 3 — Cookbooks:** The canonical assembled reference — an ordered, two-phase setup artifact.

### Authoring Cookbooks

A cookbook is a **setup artifact**, not a reading bundle. It runs in two phases: (1) the setup recipes install files/deps/config in order, then (2) the `using-*` skills are installed via `bunx skills add` so the agent retains the patterns.

List each `using-*` skill **right after its setup recipe**, not at the end. When a cookbook is assembled, setup recipes inline their full content while skill recipes render as a compact section (title + motivation + `bunx skills add ... -s <slug>` command) generated from their metadata. Do not duplicate skill content into a cookbook — just include the slug in `recipes` in the right position.

### Installable Utilities

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
