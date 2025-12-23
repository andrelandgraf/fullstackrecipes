import { createMcpHandler } from "mcp-handler";
import { readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import {
  getAllCookbooks,
  getAllRecipes,
  getCookbookRecipes,
  getItemPromptText,
  getItemResourceUri,
} from "@/lib/recipes/data";
import { loadRecipeMarkdown } from "@/lib/recipes/loader";

// Derive the server type directly from createMcpHandler
type McpServer = Parameters<Parameters<typeof createMcpHandler>[0]>[0];

function registerBaseResourcesAndPrompts(server: McpServer) {
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
}

function replyWithState(
  state: Record<string, unknown>,
  message?: string,
): {
  content: { type: "text"; text: string }[];
  structuredContent: Record<string, unknown>;
} {
  return {
    content: message ? [{ type: "text", text: message }] : [],
    structuredContent: state,
  };
}

const WIDGET_URI = "ui://widget/fullstackrecipes.html";
const widgetHtml = readFileSync(
  path.join(process.cwd(), "public", "fullstackrecipes-widget.html"),
  "utf8",
);

const selectItemInputSchema = {
  slug: z.string().min(1),
};

function registerOpenAiWidgetAndTools(server: McpServer) {
  server.registerResource(
    "fullstackrecipes-widget",
    WIDGET_URI,
    {},
    async () => ({
      contents: [
        {
          uri: WIDGET_URI,
          mimeType: "text/html+skybridge",
          text: widgetHtml,
          _meta: { "openai/widgetPrefersBorder": true },
        },
      ],
    }),
  );

  server.registerTool(
    "list_items",
    {
      title: "List recipes and cookbooks",
      description: "Returns all fullstackrecipes items (recipes + cookbooks).",
      inputSchema: {},
      _meta: {
        "openai/outputTemplate": WIDGET_URI,
        "openai/toolInvocation/invoking": "Loading recipes",
        "openai/toolInvocation/invoked": "Loaded recipes",
      },
    },
    async () => {
      const recipes = getAllRecipes().map((r) => ({
        type: "recipe",
        slug: r.slug,
        title: r.title,
        description: r.description,
        tags: r.tags,
      }));
      const cookbooks = getAllCookbooks().map((c) => ({
        type: "cookbook",
        slug: c.slug,
        title: c.title,
        description: c.description,
        tags: c.tags,
      }));

      return replyWithState({ items: [...cookbooks, ...recipes] });
    },
  );

  server.registerTool(
    "select_item",
    {
      title: "Select a recipe or cookbook",
      description:
        "Selects a recipe/cookbook for the conversation. The model can then read the existing MCP resource URI for the selected item.",
      inputSchema: selectItemInputSchema,
      _meta: {
        "openai/outputTemplate": WIDGET_URI,
        "openai/toolInvocation/invoking": "Selecting item",
        "openai/toolInvocation/invoked": "Selected item",
      },
    },
    async (args) => {
      const parsed = z.object(selectItemInputSchema).safeParse(args);
      if (!parsed.success) {
        return replyWithState(
          { error: "Invalid input." },
          "Invalid input. Expected: { slug: string }",
        );
      }

      const slug = parsed.data.slug;
      const recipe = getAllRecipes().find((r) => r.slug === slug);
      const cookbook = getAllCookbooks().find((c) => c.slug === slug);
      const item = recipe ?? cookbook;

      if (!item) {
        return replyWithState(
          { error: `Item not found: ${slug}` },
          `Item not found: ${slug}`,
        );
      }

      const resourceUri = getItemResourceUri(item);
      return replyWithState(
        {
          selected: {
            type: recipe ? "recipe" : "cookbook",
            slug: item.slug,
            title: item.title,
            description: item.description,
            tags: item.tags,
            resourceUri,
            mimeType: "text/markdown",
          },
        },
        `Selected "${item.title}". Use the MCP resource ${resourceUri} to answer questions or implement it.`,
      );
    },
  );
}

export const mcpHandler = createMcpHandler(
  (server) => {
    registerBaseResourcesAndPrompts(server);
  },
  {
    capabilities: {
      resources: {},
      prompts: {},
    },
  },
  { basePath: "/api" },
);

export const openAiMcpHandler = createMcpHandler(
  (server) => {
    registerBaseResourcesAndPrompts(server);
    registerOpenAiWidgetAndTools(server);
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  },
  { basePath: "/api" },
);
