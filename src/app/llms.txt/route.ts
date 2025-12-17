import {
  getAllCookbooks,
  getAllRecipes,
  getRegistryItems,
} from "@/lib/recipes/data";

export async function GET() {
  const cookbooks = getAllCookbooks();
  const recipes = getAllRecipes();
  const registryItems = getRegistryItems();

  const content = `# Fullstack Recipes

> Guides and patterns for building full stack AI apps with Next.js, React, TypeScript, Vercel, Neon, Drizzle, Better Auth, Resend, Stripe, AI SDK, Workflow Development Kit, and Bun.

## What is Fullstack Recipes?

Fullstack Recipes provides step-by-step guides ("recipes") for adding features to your Next.js application. Each recipe is designed to be copy-pasted into your AI coding assistant (Cursor, Claude, Copilot, etc.) for implementation.

Key features:
- Complete, production-ready code patterns
- MCP server integration for AI coding agents
- Shadcn registry for installable utilities
- Cookbooks that bundle related recipes together

## How to Use

1. **Copy & Paste**: Visit a recipe page and copy the markdown to paste into your AI assistant
2. **MCP Server**: Add our MCP server to your coding agent for direct recipe access
3. **Shadcn Registry**: Install reusable utilities via \`bunx shadcn@latest add\`

## MCP Server

Add to your coding agent's MCP configuration:

\`\`\`json
{
  "mcpServers": {
    "fullstackrecipes": {
      "url": "https://fullstackrecipes.com/api/mcp"
    }
  }
}
\`\`\`

---

## Cookbooks

Cookbooks are curated bundles of multiple recipes for complete feature implementations.

${cookbooks.map((c) => `- [${c.title}](/recipes/${c.slug}) - ${c.description}`).join("\n")}

---

## Recipes

${recipes.map((r) => `- [${r.title}](/recipes/${r.slug}) - ${r.description}`).join("\n")}

---

## Shadcn Registry

Install reusable utilities directly:

\`\`\`bash
${registryItems.map((item) => `bunx shadcn@latest add https://fullstackrecipes.com/r/${item.name}.json`).join("\n")}
\`\`\`

---

## Links

- Homepage: https://fullstackrecipes.com
- MCP API: https://fullstackrecipes.com/api/mcp
`;

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
