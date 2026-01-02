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
  getItemBySlug,
} from "@/lib/recipes/data";
import { loadRecipeMarkdown } from "@/lib/recipes/loader";
import {
  getUserRecipes,
  getUserLibrary,
  createUserRecipe,
  updateUserRecipe,
  deleteUserRecipe,
  addBookmark,
  removeBookmark,
  generateUniqueSlug,
  getUserRecipeById,
} from "@/lib/recipes/queries";
import type { UserRecipe } from "@/lib/recipes/schema";

// Derive the server type directly from createMcpHandler
type McpServer = Parameters<Parameters<typeof createMcpHandler>[0]>[0];

// Helper to extract user ID from request headers (if available)
// In MCP context, we'll need to handle authentication differently
// For now, we'll create authenticated tools that require userId parameter

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

// ============================================================================
// User Recipe MCP Tools
// ============================================================================

const userIdSchema = {
  userId: z.string().min(1).describe("The authenticated user's ID"),
};

const createRecipeSchema = {
  ...userIdSchema,
  title: z.string().min(1).describe("The recipe title"),
  description: z
    .string()
    .optional()
    .describe("A brief description of the recipe"),
  content: z.string().min(1).describe("The recipe content in markdown format"),
  tags: z.array(z.string()).optional().describe("Tags for categorization"),
  isPublic: z
    .boolean()
    .optional()
    .describe("Whether the recipe is public (default: false)"),
};

const updateRecipeSchema = {
  ...userIdSchema,
  recipeId: z.string().min(1).describe("The ID of the recipe to update"),
  title: z.string().optional().describe("New title"),
  description: z.string().optional().describe("New description"),
  content: z.string().optional().describe("New content"),
  tags: z.array(z.string()).optional().describe("New tags"),
  isPublic: z.boolean().optional().describe("New visibility setting"),
};

const deleteRecipeSchema = {
  ...userIdSchema,
  recipeId: z.string().min(1).describe("The ID of the recipe to delete"),
};

const listRecipesSchema = {
  ...userIdSchema,
};

const getRecipeSchema = {
  recipeId: z.string().min(1).describe("The ID of the recipe to get"),
};

const bookmarkSchema = {
  ...userIdSchema,
  builtInSlug: z
    .string()
    .optional()
    .describe("Slug of a built-in recipe to bookmark"),
  userRecipeId: z
    .string()
    .optional()
    .describe("ID of a user recipe to bookmark"),
};

function registerUserRecipeTools(server: McpServer) {
  // List user's own recipes
  server.registerTool(
    "list_my_recipes",
    {
      title: "List my recipes",
      description: "Returns all recipes created by the authenticated user.",
      inputSchema: listRecipesSchema,
    },
    async (args) => {
      const parsed = z.object(listRecipesSchema).safeParse(args);
      if (!parsed.success) {
        return {
          content: [
            { type: "text", text: "Invalid input: userId is required" },
          ],
        };
      }

      const recipes = await getUserRecipes(parsed.data.userId);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              recipes.map((r) => ({
                id: r.id,
                slug: r.slug,
                title: r.title,
                description: r.description,
                tags: r.tags,
                isPublic: r.isPublic,
                createdAt: r.createdAt,
                updatedAt: r.updatedAt,
              })),
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  // List user's library (bookmarked recipes)
  server.registerTool(
    "list_library_recipes",
    {
      title: "List library recipes",
      description:
        "Returns all recipes in the user's library (bookmarked recipes).",
      inputSchema: listRecipesSchema,
    },
    async (args) => {
      const parsed = z.object(listRecipesSchema).safeParse(args);
      if (!parsed.success) {
        return {
          content: [
            { type: "text", text: "Invalid input: userId is required" },
          ],
        };
      }

      const library = await getUserLibrary(parsed.data.userId);
      const items = library.map((item) => {
        if (item.type === "built-in") {
          return {
            type: "built-in",
            slug: item.item.slug,
            title: item.item.title,
            description: item.item.description,
            tags: item.item.tags,
            bookmarkedAt: item.bookmarkedAt,
          };
        }
        return {
          type: "user-recipe",
          id: item.item.id,
          title: item.item.title,
          description: item.item.description,
          tags: item.item.tags,
          author: item.item.userName,
          bookmarkedAt: item.bookmarkedAt,
        };
      });

      return {
        content: [{ type: "text", text: JSON.stringify(items, null, 2) }],
      };
    },
  );

  // Create a new recipe
  server.registerTool(
    "create_recipe",
    {
      title: "Create recipe",
      description: "Creates a new recipe for the authenticated user.",
      inputSchema: createRecipeSchema,
    },
    async (args) => {
      const parsed = z.object(createRecipeSchema).safeParse(args);
      if (!parsed.success) {
        return {
          content: [
            { type: "text", text: `Invalid input: ${parsed.error.message}` },
          ],
        };
      }

      const { userId, title, description, content, tags, isPublic } =
        parsed.data;
      const slug = await generateUniqueSlug(userId, title);

      const recipe = await createUserRecipe({
        userId,
        slug,
        title,
        description: description ?? "",
        content,
        tags: tags ?? [],
        isPublic: isPublic ?? false,
      });

      return {
        content: [
          {
            type: "text",
            text: `Recipe created successfully!\n\n${JSON.stringify(
              {
                id: recipe.id,
                slug: recipe.slug,
                title: recipe.title,
                isPublic: recipe.isPublic,
              },
              null,
              2,
            )}`,
          },
        ],
      };
    },
  );

  // Update a recipe
  server.registerTool(
    "update_recipe",
    {
      title: "Update recipe",
      description:
        "Updates an existing recipe owned by the authenticated user.",
      inputSchema: updateRecipeSchema,
    },
    async (args) => {
      const parsed = z.object(updateRecipeSchema).safeParse(args);
      if (!parsed.success) {
        return {
          content: [
            { type: "text", text: `Invalid input: ${parsed.error.message}` },
          ],
        };
      }

      const { userId, recipeId, title, description, content, tags, isPublic } =
        parsed.data;

      // Check if title changed and generate new slug if needed
      let slug: string | undefined;
      if (title) {
        const existing = await getUserRecipeById(recipeId);
        if (existing && existing.title !== title) {
          slug = await generateUniqueSlug(userId, title);
        }
      }

      const recipe = await updateUserRecipe(recipeId, userId, {
        ...(slug && { slug }),
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(content && { content }),
        ...(tags && { tags }),
        ...(isPublic !== undefined && { isPublic }),
      });

      if (!recipe) {
        return {
          content: [
            {
              type: "text",
              text: "Recipe not found or you don't have permission to update it.",
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `Recipe updated successfully!\n\n${JSON.stringify(
              {
                id: recipe.id,
                slug: recipe.slug,
                title: recipe.title,
                isPublic: recipe.isPublic,
              },
              null,
              2,
            )}`,
          },
        ],
      };
    },
  );

  // Delete a recipe
  server.registerTool(
    "delete_recipe",
    {
      title: "Delete recipe",
      description: "Deletes a recipe owned by the authenticated user.",
      inputSchema: deleteRecipeSchema,
    },
    async (args) => {
      const parsed = z.object(deleteRecipeSchema).safeParse(args);
      if (!parsed.success) {
        return {
          content: [
            { type: "text", text: `Invalid input: ${parsed.error.message}` },
          ],
        };
      }

      const success = await deleteUserRecipe(
        parsed.data.recipeId,
        parsed.data.userId,
      );

      if (!success) {
        return {
          content: [
            {
              type: "text",
              text: "Recipe not found or you don't have permission to delete it.",
            },
          ],
        };
      }

      return {
        content: [{ type: "text", text: "Recipe deleted successfully." }],
      };
    },
  );

  // Get a specific recipe content
  server.registerTool(
    "get_recipe_content",
    {
      title: "Get recipe content",
      description: "Gets the full content of a user-created recipe by ID.",
      inputSchema: getRecipeSchema,
    },
    async (args) => {
      const parsed = z.object(getRecipeSchema).safeParse(args);
      if (!parsed.success) {
        return {
          content: [
            { type: "text", text: `Invalid input: ${parsed.error.message}` },
          ],
        };
      }

      const recipe = await getUserRecipeById(parsed.data.recipeId);

      if (!recipe) {
        return {
          content: [{ type: "text", text: "Recipe not found." }],
        };
      }

      // Only allow access to public recipes or own recipes
      // Note: without userId param, we can only check public
      if (!recipe.isPublic) {
        return {
          content: [{ type: "text", text: "Recipe is private." }],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `# ${recipe.title}\n\n${recipe.description}\n\nTags: ${recipe.tags?.join(", ") || "None"}\n\n---\n\n${recipe.content}`,
          },
        ],
      };
    },
  );

  // Add bookmark
  server.registerTool(
    "add_bookmark",
    {
      title: "Add to library",
      description:
        "Adds a recipe to the user's library. Provide either builtInSlug for official recipes or userRecipeId for community recipes.",
      inputSchema: bookmarkSchema,
    },
    async (args) => {
      const parsed = z.object(bookmarkSchema).safeParse(args);
      if (!parsed.success) {
        return {
          content: [
            { type: "text", text: `Invalid input: ${parsed.error.message}` },
          ],
        };
      }

      const { userId, builtInSlug, userRecipeId } = parsed.data;

      if (!builtInSlug && !userRecipeId) {
        return {
          content: [
            {
              type: "text",
              text: "Provide either builtInSlug or userRecipeId.",
            },
          ],
        };
      }

      if (builtInSlug && userRecipeId) {
        return {
          content: [
            {
              type: "text",
              text: "Provide only one of builtInSlug or userRecipeId.",
            },
          ],
        };
      }

      const target = builtInSlug
        ? { builtInSlug }
        : { userRecipeId: userRecipeId! };

      await addBookmark(userId, target);

      return {
        content: [{ type: "text", text: "Added to library." }],
      };
    },
  );

  // Remove bookmark
  server.registerTool(
    "remove_bookmark",
    {
      title: "Remove from library",
      description: "Removes a recipe from the user's library.",
      inputSchema: bookmarkSchema,
    },
    async (args) => {
      const parsed = z.object(bookmarkSchema).safeParse(args);
      if (!parsed.success) {
        return {
          content: [
            { type: "text", text: `Invalid input: ${parsed.error.message}` },
          ],
        };
      }

      const { userId, builtInSlug, userRecipeId } = parsed.data;

      if (!builtInSlug && !userRecipeId) {
        return {
          content: [
            {
              type: "text",
              text: "Provide either builtInSlug or userRecipeId.",
            },
          ],
        };
      }

      const target = builtInSlug
        ? { builtInSlug }
        : { userRecipeId: userRecipeId! };

      await removeBookmark(userId, target);

      return {
        content: [{ type: "text", text: "Removed from library." }],
      };
    },
  );
}

export const mcpHandler = createMcpHandler(
  (server) => {
    registerBaseResourcesAndPrompts(server);
    registerUserRecipeTools(server);
  },
  {
    capabilities: {
      resources: {},
      prompts: {},
      tools: {},
    },
  },
  { basePath: "/api" },
);

export const openAiMcpHandler = createMcpHandler(
  (server) => {
    registerBaseResourcesAndPrompts(server);
    registerOpenAiWidgetAndTools(server);
    registerUserRecipeTools(server);
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  },
  { streamableHttpEndpoint: "/api/openai/mcp" },
);
