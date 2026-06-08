import { test, expect } from "@playwright/test";

test.describe("Sign In Page", () => {
  test("should display the sign in form", async ({ page }) => {
    await page.goto("/sign-in");

    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("should link to forgot password", async ({ page }) => {
    await page.goto("/sign-in");

    const forgotLink = page.getByRole("link", { name: /forgot/i });
    await expect(forgotLink).toBeVisible();
    await forgotLink.click();

    await expect(page).toHaveURL(/forgot-password/);
  });

  test("should link to sign up", async ({ page }) => {
    await page.goto("/sign-in");

    const signUpLink = page.getByRole("link", { name: /sign up|create/i });
    await expect(signUpLink).toBeVisible();
    await signUpLink.click();

    await expect(page).toHaveURL(/sign-up/);
  });
});

test.describe("Protected Routes", () => {
  test("should redirect unauthenticated user from /chats", async ({ page }) => {
    await page.goto("/chats");
    await expect(page).toHaveURL(/sign-in/);
  });

  test("should redirect unauthenticated user from /profile", async ({
    page,
  }) => {
    await page.goto("/profile");
    await expect(page).toHaveURL(/sign-in/);
  });

  test("should redirect unauthenticated user from /settings", async ({
    page,
  }) => {
    await page.goto("/settings");
    await expect(page).toHaveURL(/sign-in/);
  });
});
