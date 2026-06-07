---
name: use-fullstackrecipes
description: Discover and follow recipes via MCP resources for setup guides, skills, and cookbooks. The meta-skill for using fullstackrecipes effectively.
---

# Building with fullstackrecipes

Discover and follow recipes via MCP resources for setup guides, skills, and cookbooks. The meta-skill for using fullstackrecipes effectively.

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

### Read a Specific Recipe

Fetch the full content of any recipe by its resource URI:

```
Read the "neon-drizzle-setup" resource from fullstackrecipes
```

The recipe content includes all steps, code examples, and file paths needed to complete the setup.

---

## Best Practices for Following Recipes

### Follow Recipes Exactly

Recipes are tested instructions. Follow them step-by-step without modifications unless you have a specific reason to deviate.

### Complete Dependencies First

Some recipes depend on others. The MCP resource descriptions indicate prerequisites. Complete setup recipes before using their corresponding skills.

### Install Skills, Don't Just Read Them

Skills (`using-*`) are installed via `bunx skills add ...` so your agent retains them for ongoing development. When you run a cookbook, installing its skills is the final setup step — not optional reading. Once a tool is configured, the installed skill provides the patterns, code examples, and API references for working with it. Skills assume the canonical stack is present, so install them only after their setup recipes are complete.

### Check for Updates

Recipes are updated as libraries evolve. When troubleshooting issues or starting new features, fetch the latest recipe content from the MCP server rather than relying on cached instructions.

---

## References

- [fullstackrecipes.com](https://fullstackrecipes.com) - Browse all recipes and cookbooks
- [MCP Resources](https://fullstackrecipes.com/api/mcp) - Direct MCP server endpoint
