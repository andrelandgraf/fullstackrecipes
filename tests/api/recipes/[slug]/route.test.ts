import { describe, it, expect, beforeAll } from "bun:test";
import { readdir } from "fs/promises";
import path from "path";
import { GET } from "@/app/api/recipes/[slug]/route";
import { getAllItems } from "@/lib/recipes/data";
import { loadRecipeMarkdown } from "@/lib/recipes/loader";

/**
 * E2E tests for the recipes API endpoint.
 *
 * These tests verify:
 * 1. Every recipe in docs/recipes returns valid markdown via the API
 * 2. Cookbooks properly aggregate their recipe content
 * 3. Custom {% registry %} tags are expanded to include source code
 */

// Helper to create a mock Request and params for the route handler
function createMockRequest(slug: string) {
  const url = `http://localhost:3000/api/recipes/${slug}`;
  const request = new Request(url);
  const params = Promise.resolve({ slug });
  return { request, params };
}

describe("GET /api/recipes/[slug]", () => {
  let docRecipeSlugs: string[] = [];

  beforeAll(async () => {
    // Get all markdown files from docs/recipes
    const recipesDir = path.join(process.cwd(), "docs", "recipes");
    const files = await readdir(recipesDir);
    docRecipeSlugs = files
      .filter((f) => f.endsWith(".md"))
      .map((f) => f.replace(".md", ""));
  });

  it("should return 404 for non-existent recipe", async () => {
    const { request, params } = createMockRequest("non-existent-recipe");
    const response = await GET(request, { params });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe("Recipe not found");
  });

  describe("all recipes return valid markdown", () => {
    // Get all items (recipes + cookbooks) from the data module
    const allItems = getAllItems();

    for (const item of allItems) {
      it(`should return markdown for "${item.slug}"`, async () => {
        const { request, params } = createMockRequest(item.slug);
        const response = await GET(request, { params });

        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.content).toBeDefined();
        expect(typeof data.content).toBe("string");
        expect(data.content.length).toBeGreaterThan(0);

        // Verify content starts with the title
        expect(data.content).toContain(`# ${item.title}`);
        // Verify description is included
        expect(data.content).toContain(item.description);
      });
    }
  });
});

describe("Registry tag expansion", () => {
  describe("registry items resolve to markdown with source code", () => {
    // Find recipes that have registry dependencies
    const allItems = getAllItems();
    const recipesWithRegistry = allItems.filter(
      (item) => "registryDeps" in item && item.registryDeps?.length,
    );

    for (const recipe of recipesWithRegistry) {
      it(`should expand registry tags in "${recipe.slug}"`, async () => {
        const markdown = await loadRecipeMarkdown(recipe);

        // Verify the registry install command is included
        expect(markdown).toContain("bunx --bun shadcn@latest add");

        // Verify at least one registry item URL is included
        const hasRegistryUrl = recipe.registryDeps?.some((dep) =>
          markdown.includes(`https://fullstackrecipes.com/r/${dep}.json`),
        );
        expect(hasRegistryUrl).toBe(true);

        // Verify "Or copy the source code:" section exists (meaning file content was inlined)
        expect(markdown).toContain("Or copy the source code:");
      });
    }
  });
});

describe("Cookbook content aggregation", () => {
  const allItems = getAllItems();
  const cookbooks = allItems.filter(
    (item) => "isCookbook" in item && item.isCookbook,
  );

  for (const cookbook of cookbooks) {
    it(`cookbook "${cookbook.slug}" aggregates all recipe content`, async () => {
      const markdown = await loadRecipeMarkdown(cookbook);

      // Verify cookbook title is present
      expect(markdown).toContain(`# ${cookbook.title}`);

      // Verify each recipe in the cookbook is included as a section
      if ("recipes" in cookbook) {
        for (const recipeSlug of cookbook.recipes) {
          const recipeItem = allItems.find((item) => item.slug === recipeSlug);
          if (recipeItem) {
            // Each recipe should appear as an h2 heading in the cookbook
            expect(markdown).toContain(`## ${recipeItem.title}`);
          }
        }
      }
    });
  }
});
