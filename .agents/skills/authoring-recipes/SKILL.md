---
name: authoring-recipes
description: Guidelines for writing fullstackrecipes recipes and cookbooks. Use when creating or editing recipe content, including installable utilities with the registry tag. For maintainers authoring recipes, not developers consuming them.
---

# Authoring Recipes

Guidelines for writing fullstackrecipes recipes and cookbooks. This skill is for maintainers writing recipes, not for developers consuming the stack (see `use-fullstackrecipes` for that).

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
