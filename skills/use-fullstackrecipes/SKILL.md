---
name: use-fullstackrecipes
description: Discover and follow fullstackrecipes (setup guides, skills, cookbooks) by fetching their Markdown. The meta-skill for finding and applying recipes correctly. Use when planning a build, adding a tool, or deciding which recipe or skill to follow.
---

# Building with fullstackrecipes

Discover and follow recipes by fetching their Markdown for setup guides, skills, and cookbooks.

## How fullstackrecipes Works

Content comes in two types:

1. **Setup Recipes** (`type: "setup"`): one-time guides to configure a tool or service (auth, database, payments). Atomic installs with declared prerequisites — adoptable on their own.
2. **Skills** (`type: "skill"`): day-to-day patterns for an already-configured tool (querying, auth, logging). They assume the canonical assembled stack and are **installed via the skills CLI**, not pasted as content.

**Cookbooks** are ordered, two-phase setups: they run their setup recipes in order, then install the matching skills. After a cookbook completes, the project has both the configured stack and the installed skills. For example, "Base App Setup" configures Next.js, Shadcn UI, Neon Postgres, Drizzle ORM, and the AI SDK, then installs the Drizzle querying skill as its final step.

## Fetching Recipes as Markdown

Every page on fullstackrecipes.com has a Markdown twin — append `.md` to any URL. No MCP server or special tooling required, just `curl`.

Start with the index to see every recipe and cookbook with its slug:

```bash
curl https://fullstackrecipes.com/llms.txt
```

Then fetch the full content of any recipe or cookbook by slug:

```bash
# A setup recipe or skill
curl https://fullstackrecipes.com/recipes/neon-drizzle-setup.md

# A cookbook (inlines all of its recipes in order)
curl https://fullstackrecipes.com/recipes/base-app-setup.md
```

Each `.md` response includes the title, description, prerequisites, and every step, code example, and file path.

## Best Practices

- **Follow recipes exactly.** They are tested instructions; don't deviate without a specific reason.
- **Complete dependencies first.** Each recipe's Prerequisites section lists what to finish first — complete a setup recipe before its matching skill.
- **Install skills, don't just read them.** Skills are installed with `bunx skills add ...` so the agent retains the patterns for ongoing work. Installing them is the final step of a cookbook, not optional reading. Install only after their setup recipes are complete.
- **Check for updates.** Recipes evolve with their libraries. When troubleshooting or starting a feature, re-fetch the latest `.md` instead of relying on cached instructions.

## References

- [fullstackrecipes.com](https://fullstackrecipes.com) - Browse all recipes and cookbooks
- [Index](https://fullstackrecipes.com/llms.txt) - Every recipe and cookbook with its slug
