import { createMcpHandler } from "mcp-handler";
import {
  getAllRecipes,
  getAllCookbooks,
  getCookbookRecipes,
  getItemResourceUri,
  getItemPromptText,
} from "@/lib/recipes/data";
import { loadRecipeMarkdown } from "@/lib/recipes/loader";

const handler = createMcpHandler(
  (server) => {
    const recipes = getAllRecipes();
    const cookbooks = getAllCookbooks();

    for (const recipe of recipes) {
      const resourceUri = getItemResourceUri(recipe);

      server.registerResource(
        `recipe-${recipe.slug}`,
        resourceUri,
        {
          title: recipe.title,
          description: recipe.description,
          mimeType: "text/markdown",
        },
        async (uri) => {
          const content = await loadRecipeMarkdown(recipe);
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

      server.registerPrompt(
        `implement-${recipe.slug}`,
        { description: `Implement the "${recipe.title}" recipe` },
        async () => ({
          messages: [
            {
              role: "user",
              content: {
                type: "resource",
                resource: {
                  uri: resourceUri,
                  mimeType: "text/markdown",
                  text: getItemPromptText(recipe),
                },
              },
            },
          ],
        }),
      );
    }

    for (const cookbook of cookbooks) {
      const resourceUri = getItemResourceUri(cookbook);

      server.registerResource(
        `cookbook-${cookbook.slug}`,
        resourceUri,
        {
          title: cookbook.title,
          description: cookbook.description,
          mimeType: "text/markdown",
        },
        async (uri) => {
          const content = await loadRecipeMarkdown(cookbook);
          const includedRecipes = getCookbookRecipes(cookbook);
          const recipesList = includedRecipes
            .map((r) => `- ${r.title}`)
            .join("\n");
          const frontmatter = `# ${cookbook.title}\n\n${cookbook.description}\n\nTags: ${cookbook.tags.length > 0 ? cookbook.tags.join(", ") : "None"}\n\n## Included Recipes\n\n${recipesList}\n\n---\n\n`;
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

      server.registerPrompt(
        `implement-${cookbook.slug}`,
        { description: `Implement the "${cookbook.title}" cookbook` },
        async () => ({
          messages: [
            {
              role: "user",
              content: {
                type: "resource",
                resource: {
                  uri: resourceUri,
                  mimeType: "text/markdown",
                  text: getItemPromptText(cookbook),
                },
              },
            },
          ],
        }),
      );
    }
  },
  {
    capabilities: {
      resources: {},
      prompts: {},
    },
  },
  { basePath: "/api" },
);

export { handler as GET, handler as POST, handler as DELETE };
