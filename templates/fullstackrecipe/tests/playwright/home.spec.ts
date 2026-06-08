import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test("should display the hero heading", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading").first()).toBeVisible();
  });

  test("should have a get started call to action", async ({ page }) => {
    await page.goto("/");

    const cta = page.getByRole("link", { name: /get started/i });
    await expect(cta).toBeVisible();
    await cta.click();

    await expect(page).toHaveURL(/sign-up/);
  });

  test("should toggle the theme", async ({ page }) => {
    await page.goto("/");

    const themeToggle = page.getByRole("button", { name: /toggle theme/i });
    if ((await themeToggle.count()) > 0) {
      await themeToggle.click();

      const darkOption = page.getByRole("menuitem", { name: /dark/i });
      if ((await darkOption.count()) > 0) {
        await darkOption.click();
        await expect(page.locator("html")).toHaveClass(/dark/);
      }
    }
  });
});
