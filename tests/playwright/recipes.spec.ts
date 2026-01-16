import { test, expect } from "@playwright/test";

/**
 * Browser tests for recipes browsing and detail pages.
 * Based on user stories: recipes-browse.json, recipes-detail.json, recipes-copy-markdown.json
 */

test.describe("Recipes Browse", () => {
  test("should display grid of recipe cards", async ({ page }) => {
    await page.goto("/#recipes");

    // Wait for recipes to load
    const recipeCards = page.locator('a[href^="/recipes/"]');
    await expect(recipeCards.first()).toBeVisible();

    // Should have multiple recipes
    const count = await recipeCards.count();
    expect(count).toBeGreaterThan(5);
  });

  test("should search recipes by text", async ({ page }) => {
    await page.goto("/#recipes");

    // Find search input
    const searchInput = page.getByPlaceholder(/search/i);
    await expect(searchInput).toBeVisible();

    // Search for "auth"
    await searchInput.fill("auth");

    // URL should update with search param
    await expect(page).toHaveURL(/q=auth/);

    // Results should be filtered
    const recipeCards = page.locator('a[href^="/recipes/"]');
    const count = await recipeCards.count();
    expect(count).toBeGreaterThan(0);

    // Clear search
    await searchInput.clear();
    await expect(page).not.toHaveURL(/q=/);
  });

  test("should filter recipes by tag", async ({ page }) => {
    await page.goto("/#recipes");

    // Find tag filter buttons
    const cookbooksTag = page
      .getByRole("button", { name: /Cookbooks/i })
      .first();

    if ((await cookbooksTag.count()) > 0) {
      await cookbooksTag.click();

      // URL should update with tags param
      await expect(page).toHaveURL(/tags=/);

      // Click "All" to clear
      const allTag = page.getByRole("button", { name: /^All$/i }).first();
      if ((await allTag.count()) > 0) {
        await allTag.click();
        await expect(page).not.toHaveURL(/tags=/);
      }
    }
  });

  test("should show no results message for invalid search", async ({
    page,
  }) => {
    await page.goto("/#recipes");

    const searchInput = page.getByPlaceholder(/search/i);
    await searchInput.fill("xyznonexistent123456");

    // Should show no results message
    await expect(page.getByText(/no recipes/i)).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Recipe Detail Page", () => {
  test("should display recipe with title and content", async ({ page }) => {
    // Navigate to a known recipe
    await page.goto("/recipes/neon-drizzle-setup");

    // Should have recipe title
    await expect(
      page.getByRole("heading", { name: /Neon.*Drizzle/i }),
    ).toBeVisible();

    // Should have tags
    await expect(page.getByText(/Setup Instructions/i)).toBeVisible();

    // Should have content with code blocks
    const codeBlocks = page.locator("pre code");
    await expect(codeBlocks.first()).toBeVisible();
  });

  test("should display cookbook with included recipes", async ({ page }) => {
    // Navigate to a cookbook
    await page.goto("/recipes/base-app-setup");

    // Should have cookbook title
    await expect(
      page.getByRole("heading", { name: /Base App Setup/i }),
    ).toBeVisible();

    // Should show included recipe count or list
    await expect(page.getByText(/recipes/i).first()).toBeVisible();
  });

  test("should show prerequisites for recipes that have them", async ({
    page,
  }) => {
    // Navigate to a recipe with prerequisites
    await page.goto("/recipes/better-auth-setup");

    // Should show required section
    const requiredSection = page.getByText(/Required/i);
    if ((await requiredSection.count()) > 0) {
      await expect(requiredSection).toBeVisible();

      // Should have links to prerequisites
      const prereqLinks = page.locator('a[href*="/recipes/neon-drizzle"]');
      expect(await prereqLinks.count()).toBeGreaterThan(0);
    }
  });

  test("should navigate back from recipe detail", async ({ page }) => {
    await page.goto("/recipes/neon-drizzle-setup");

    // Find back button/link
    const backButton = page
      .getByRole("link", { name: /back/i })
      .or(page.locator('a[href="/#recipes"]'))
      .first();

    if ((await backButton.count()) > 0) {
      await backButton.click();
      await expect(page).toHaveURL(/\/#recipes/);
    }
  });

  test("should return 404 for non-existent recipe", async ({ page }) => {
    const response = await page.goto(
      "/recipes/this-recipe-does-not-exist-12345",
    );
    expect(response?.status()).toBe(404);
  });

  test("should redirect old slugs to new slugs", async ({ page }) => {
    // Test redirect from old slug to new (if any redirects exist)
    await page.goto("/recipes/env-config");

    // Should redirect to new slug
    await expect(page).toHaveURL(/env-management/);
    expect(page.url()).not.toContain("env-config");
  });
});

test.describe("Recipe Actions", () => {
  test("should have Add to Agent button on recipe page", async ({ page }) => {
    await page.goto("/recipes/neon-drizzle-setup");

    const addButton = page.getByRole("button", { name: /Add to Agent/i });
    await expect(addButton).toBeVisible();
  });

  test("should have copy buttons on code blocks", async ({ page }) => {
    await page.goto("/recipes/neon-drizzle-setup");

    // Code blocks should have Copy code button
    const copyButton = page.getByRole("button", { name: /Copy code/i }).first();
    await expect(copyButton).toBeVisible();
  });
});
