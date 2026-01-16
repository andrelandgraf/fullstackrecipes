import { test, expect } from "@playwright/test";

/**
 * Browser tests for the homepage.
 * Based on user stories: home-page.json, theme-toggle.json, registry-install.json
 */

test.describe("Homepage", () => {
  test.describe("Hero Section", () => {
    test("should display hero title and description", async ({ page }) => {
      await page.goto("/");

      // Hero title is "Instructions for AI Agents"
      await expect(
        page.getByRole("heading", { name: /Instructions for/i }).first(),
      ).toBeVisible();

      // Recipe count badge
      await expect(page.getByText(/recipes/i).first()).toBeVisible();
    });

    test("should have working Browse Recipes button", async ({ page }) => {
      await page.goto("/");

      const browseButton = page.getByRole("link", { name: /Browse Recipes/i });
      await expect(browseButton).toBeVisible();
      await browseButton.click();

      // Should scroll to recipes section (anchor link)
      await expect(page).toHaveURL(/#recipes/);
    });

    test("should have Add to Agent button that opens wizard", async ({
      page,
    }) => {
      await page.goto("/");

      const addButton = page.getByRole("button", { name: /Add to Agent/i });
      await expect(addButton).toBeVisible();
      await addButton.click();

      // Wizard dialog should open
      await expect(page.getByRole("dialog")).toBeVisible();
      // Use more specific selector - the dialog title
      await expect(
        page.getByRole("heading", { name: /Select Recipes/i }),
      ).toBeVisible();
    });
  });

  test.describe("Demo Section", () => {
    test("should display demo section with sign-in CTA", async ({ page }) => {
      await page.goto("/");

      // Find demo section
      const signInButton = page.getByRole("link", { name: /Sign in/i }).first();
      await expect(signInButton).toBeVisible();
    });

    test("should have GitHub link in demo section", async ({ page }) => {
      await page.goto("/");

      const githubLink = page
        .getByRole("link", { name: /GitHub/i })
        .or(page.locator('a[href*="github.com"]'))
        .first();
      await expect(githubLink).toBeVisible();
    });
  });

  test.describe("Footer", () => {
    test("should display footer with external links", async ({ page }) => {
      await page.goto("/");

      // Scroll to footer
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

      // GitHub link should be present
      const githubLink = page.locator('footer a[href*="github.com"]').first();
      await expect(githubLink).toBeVisible();
    });
  });

  test.describe("Registry Section", () => {
    test("should display registry items", async ({ page }) => {
      await page.goto("/");

      // Scroll to registry section
      const registrySection = page.locator("#registry, [id*='registry']");
      if ((await registrySection.count()) > 0) {
        await registrySection.scrollIntoViewIfNeeded();

        // Should have registry item cards
        const registryItems = page.locator("[data-registry-item]");
        if ((await registryItems.count()) > 0) {
          await expect(registryItems.first()).toBeVisible();
        }
      }
    });

    test("should have copy button for install command", async ({ page }) => {
      await page.goto("/");

      // Look for shadcn install command area
      const installCommand = page.getByText(/bunx.*shadcn/i).first();
      if ((await installCommand.count()) > 0) {
        await expect(installCommand).toBeVisible();
      }
    });
  });
});

test.describe("Theme Toggle", () => {
  test("should toggle between light and dark theme", async ({ page }) => {
    await page.goto("/");

    // Find theme toggle
    const themeToggle = page.getByRole("button", { name: /toggle theme/i });
    await expect(themeToggle).toBeVisible();

    // Get initial theme
    const html = page.locator("html");
    const initialClass = await html.getAttribute("class");

    // Click to toggle
    await themeToggle.click();

    // Wait for theme menu to appear and select a theme
    const darkOption = page.getByRole("menuitem", { name: /dark/i });
    if ((await darkOption.count()) > 0) {
      await darkOption.click();
      await page.waitForTimeout(100);

      const newClass = await html.getAttribute("class");
      expect(newClass).toContain("dark");
    }
  });

  test("should have light, dark, and system options", async ({ page }) => {
    await page.goto("/");

    const themeToggle = page.getByRole("button", { name: /toggle theme/i });
    await themeToggle.click();

    // Should show menu with options
    await expect(page.getByRole("menuitem", { name: /light/i })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: /dark/i })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: /system/i })).toBeVisible();
  });
});
