import { createMcpHandler } from "mcp-handler";
import { getAllRecipes } from "@/lib/recipes/data";
import { loadRecipeContent } from "@/lib/recipes/loader";

const handler = createMcpHandler(
  (server) => {
    const recipes = getAllRecipes();

    for (const recipe of recipes) {
      server.registerResource(
        `recipe-${recipe.slug}`,
        `recipe://fullstackrecipes.com/${recipe.slug}`,
        {
          title: recipe.title,
          description: recipe.description,
          mimeType: "text/markdown",
        },
        async (uri) => {
          const content = await loadRecipeContent(recipe);
          const frontmatter = `# ${recipe.title}\n\n${recipe.description}\n\nTags: ${recipe.tags.length > 0 ? recipe.tags.join(", ") : "None"}\n\n---\n\n`;
          return {
            contents: [
              {
                uri: uri.href,
                mimeType: "text/markdown",
                text: frontmatter + content,
              },
            ],
          };
        },
      );
    }
  },
  {
    capabilities: {
      resources: {},
    },
  },
  { basePath: "/api" },
);

export { handler as GET, handler as POST, handler as DELETE };
