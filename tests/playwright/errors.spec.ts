import { test, expect } from "@playwright/test";

/**
 * Browser tests for error pages.
 * Based on user stories: error-pages.json
 */

test.describe("Error Pages", () => {
  test("should show 404 page for non-existent routes", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist-12345");

    // Should return 404 status
    expect(response?.status()).toBe(404);

    // Should display 404 content - page shows "Recipe Not Found" and "404"
    await expect(page.getByText("404")).toBeVisible();

    // Should have link back to home - "Back to Kitchen"
    const homeLink = page.getByRole("link", { name: /Kitchen|home/i });
    await expect(homeLink).toBeVisible();
  });

  test("should show 404 for non-existent recipe", async ({ page }) => {
    const response = await page.goto("/recipes/this-recipe-does-not-exist");

    expect(response?.status()).toBe(404);
    await expect(page.getByText("404")).toBeVisible();
  });

  test("should navigate home from 404 page", async ({ page }) => {
    await page.goto("/this-page-does-not-exist-12345");

    // Click "Back to Kitchen" link
    const homeLink = page.getByRole("link", { name: /Kitchen/i });
    await homeLink.click();

    await expect(page).toHaveURL("/");
  });
});

test.describe("SEO and Metadata", () => {
  test("homepage should have correct title", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/Fullstack Recipes/);
  });

  test("homepage should have meta description", async ({ page }) => {
    await page.goto("/");

    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toHaveAttribute("content", /.+/);
  });

  test("recipe page should have recipe-specific title", async ({ page }) => {
    await page.goto("/recipes/neon-drizzle-setup");

    await expect(page).toHaveTitle(/Neon.*Drizzle/i);
  });

  test("recipe page should have og:image meta tag", async ({ page }) => {
    await page.goto("/recipes/neon-drizzle-setup");

    const ogImage = page.locator('meta[property="og:image"]');
    await expect(ogImage).toHaveAttribute("content", /.+/);
  });
});

test.describe("Sitemap", () => {
  test("should return valid sitemap XML", async ({ page }) => {
    const response = await page.goto("/sitemap.xml");

    expect(response?.status()).toBe(200);
    expect(response?.headers()["content-type"]).toContain("xml");

    const content = await page.content();
    expect(content).toContain("<urlset");
    expect(content).toContain("<url>");
    expect(content).toContain("<loc>");
  });
});

test.describe("LLMs.txt", () => {
  test("should return plain text content", async ({ request }) => {
    const response = await request.get("/llms.txt");

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/plain");

    const content = await response.text();
    expect(content).toContain("Fullstack Recipes");
    expect(content).toContain("/recipes/");
  });
});
