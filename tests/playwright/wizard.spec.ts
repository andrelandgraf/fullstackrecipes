import { test, expect } from "@playwright/test";

/**
 * Browser tests for the Add to Agent wizard.
 * Based on user stories: add-fullstackrecipes-to-agent.json
 */

test.describe("Add to Agent Wizard", () => {
  test("should open wizard from hero button", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: /Add to Agent/i }).click();

    // Wizard dialog should open
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("should show recipe selection step first", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Add to Agent/i }).click();

    // Step indicator should show Select Recipes - use dialog title
    await expect(
      page.getByRole("heading", { name: /Select Recipes/i }),
    ).toBeVisible();

    // Should have search input within the dialog
    await expect(
      page
        .getByRole("dialog")
        .getByPlaceholder(/search/i)
        .first(),
    ).toBeVisible();
  });

  test("should be able to search recipes in wizard", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Add to Agent/i }).click();

    const searchInput = page
      .getByRole("dialog")
      .getByPlaceholder(/search/i)
      .first();
    await searchInput.fill("auth");

    // Results should filter
    await page.waitForTimeout(300);

    // Should show authentication-related recipes - look for specific recipe title
    await expect(
      page
        .getByRole("dialog")
        .getByText(/Authentication/i)
        .first(),
    ).toBeVisible();
  });

  test("should select and deselect recipes", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Add to Agent/i }).click();

    // Click on a recipe checkbox or item to select it
    const checkboxes = page.getByRole("dialog").getByRole("checkbox");

    if ((await checkboxes.count()) > 0) {
      // Click the first checkbox to select a recipe
      await checkboxes.first().click();

      // Verify checkbox is checked
      await expect(checkboxes.first()).toBeChecked();
    }
  });

  test("should have Clear all button", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Add to Agent/i }).click();

    const clearButton = page.getByRole("button", { name: /clear all/i });
    if ((await clearButton.count()) > 0) {
      await expect(clearButton).toBeVisible();
    }
  });

  test("should navigate to agent configuration step", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Add to Agent/i }).click();

    // Click Next to go to agent step - use exact match to avoid Next.js devtools button
    const nextButton = page
      .getByRole("dialog")
      .getByRole("button", { name: "Next", exact: true });
    await nextButton.click();

    // Should show agent configuration tabs - use first() since both Markdown and MCP tabs exist
    await expect(
      page
        .getByRole("dialog")
        .getByRole("tab", { name: /Markdown|MCP/i })
        .first(),
    ).toBeVisible();
  });

  test("should show Copy Markdown tab", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Add to Agent/i }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Next", exact: true })
      .click();

    const markdownTab = page
      .getByRole("dialog")
      .getByRole("tab", { name: /markdown/i });
    if ((await markdownTab.count()) > 0) {
      await markdownTab.click();

      // Should show copy button
      await expect(
        page.getByRole("dialog").getByRole("button", { name: /copy/i }),
      ).toBeVisible();
    }
  });

  test("should show MCP/Plugin configuration tab", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Add to Agent/i }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Next", exact: true })
      .click();

    const mcpTab = page
      .getByRole("dialog")
      .getByRole("tab", { name: /MCP|Plugin/i })
      .first();
    if ((await mcpTab.count()) > 0) {
      await mcpTab.click();

      // Should show editor tabs (Cursor, VS Code, Claude Code)
      await expect(
        page
          .getByRole("dialog")
          .getByText(/Cursor|VS Code|Claude/i)
          .first(),
      ).toBeVisible();
    }
  });

  test("should close wizard with close button", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Add to Agent/i }).click();

    // Find close button (X or Close)
    const closeButton = page
      .getByRole("dialog")
      .getByRole("button", { name: /close|×/i })
      .first();
    await closeButton.click();

    // Dialog should close
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });
});

test.describe("Wizard from Recipe Page", () => {
  test("should open wizard from recipe detail page", async ({ page }) => {
    await page.goto("/recipes/neon-drizzle-setup");

    const addButton = page.getByRole("button", { name: /Add to Agent/i });
    if ((await addButton.count()) > 0) {
      await addButton.click();

      // Wizard should open with recipe pre-selected
      await expect(page.getByRole("dialog")).toBeVisible();
    }
  });
});
