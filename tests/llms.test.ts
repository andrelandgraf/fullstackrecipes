import { describe, it, expect } from "bun:test";
import { GET } from "@/app/llms.txt/route";
import {
  getAllCookbooks,
  getAllRecipes,
  getRegistryItems,
} from "@/lib/recipes/data";

/**
 * E2E tests for the llms.txt endpoint.
 *
 * These tests verify:
 * 1. The endpoint returns valid plain text
 * 2. All cookbooks are listed
 * 3. All recipes are listed
 * 4. All registry items are listed
 * 5. MCP server configuration is included
 */

describe("GET /llms.txt", () => {
  it("should return 200 with plain text content type", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe(
      "text/plain; charset=utf-8",
    );
  });

  it("should return non-empty content", async () => {
    const response = await GET();
    const content = await response.text();

    expect(content.length).toBeGreaterThan(0);
    expect(content).toContain("# Fullstack Recipes");
  });

  describe("content includes all cookbooks", () => {
    const cookbooks = getAllCookbooks();

    it("should have cookbook section", async () => {
      const response = await GET();
      const content = await response.text();

      expect(content).toContain("## Cookbooks");
    });

    for (const cookbook of cookbooks) {
      it(`should include cookbook "${cookbook.title}"`, async () => {
        const response = await GET();
        const content = await response.text();

        expect(content).toContain(cookbook.title);
        expect(content).toContain(`/recipes/${cookbook.slug}`);
      });
    }
  });

  describe("content includes all recipes", () => {
    const recipes = getAllRecipes();

    it("should have recipes section", async () => {
      const response = await GET();
      const content = await response.text();

      expect(content).toContain("## Recipes");
    });

    for (const recipe of recipes) {
      it(`should include recipe "${recipe.title}"`, async () => {
        const response = await GET();
        const content = await response.text();

        expect(content).toContain(recipe.title);
        expect(content).toContain(`/recipes/${recipe.slug}`);
      });
    }
  });

  describe("content includes shadcn registry", () => {
    const registryItems = getRegistryItems();

    it("should have registry section", async () => {
      const response = await GET();
      const content = await response.text();

      expect(content).toContain("## Shadcn Registry");
    });

    for (const item of registryItems) {
      it(`should include registry item "${item.name}"`, async () => {
        const response = await GET();
        const content = await response.text();

        expect(content).toContain(
          `https://fullstackrecipes.com/r/${item.name}.json`,
        );
      });
    }
  });

  describe("content includes MCP server configuration", () => {
    it("should have MCP server section", async () => {
      const response = await GET();
      const content = await response.text();

      expect(content).toContain("## MCP Server");
      expect(content).toContain("https://fullstackrecipes.com/api/mcp");
    });

    it("should include JSON configuration example", async () => {
      const response = await GET();
      const content = await response.text();

      expect(content).toContain("mcpServers");
      expect(content).toContain("fullstackrecipes");
    });
  });
});
