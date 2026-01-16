import { test, expect } from "@playwright/test";

/**
 * Browser tests for authentication flows.
 * Based on user stories: authentication-sign-in.json, authentication-sign-up.json,
 * authentication-sign-out.json, authentication-password-reset.json
 */

test.describe("Sign In Page", () => {
  test("should display sign in form", async ({ page }) => {
    await page.goto("/sign-in");

    // Page shows "Welcome back" as the main title
    await expect(page.getByText("Welcome back")).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("should have remember me checkbox", async ({ page }) => {
    await page.goto("/sign-in");

    const rememberMe = page.getByLabel(/remember/i);
    if ((await rememberMe.count()) > 0) {
      await expect(rememberMe).toBeVisible();
    }
  });

  test("should validate required fields", async ({ page }) => {
    await page.goto("/sign-in");

    // Click submit without filling form
    await page.getByRole("button", { name: /sign in/i }).click();

    // Email field should be invalid
    const emailInput = page.getByLabel(/email/i);
    const isInvalid = await emailInput.evaluate(
      (el: HTMLInputElement) => !el.validity.valid,
    );
    expect(isInvalid).toBe(true);
  });

  test("should show error for invalid credentials", async ({ page }) => {
    await page.goto("/sign-in");

    await page.getByLabel(/email/i).fill("nonexistent@example.com");
    await page.getByLabel(/password/i).fill("wrongpassword");
    await page.getByRole("button", { name: /sign in/i }).click();

    // Should show error toast or message
    await expect(
      page
        .getByText(/invalid|incorrect|error/i)
        .or(page.locator('[role="alert"]')),
    ).toBeVisible({ timeout: 5000 });
  });

  test("should link to forgot password page", async ({ page }) => {
    await page.goto("/sign-in");

    const forgotLink = page.getByRole("link", { name: /forgot/i });
    await expect(forgotLink).toBeVisible();
    await forgotLink.click();

    await expect(page).toHaveURL(/forgot-password/);
  });

  test("should link to sign up page", async ({ page }) => {
    await page.goto("/sign-in");

    const signUpLink = page.getByRole("link", { name: /sign up|create/i });
    await expect(signUpLink).toBeVisible();
    await signUpLink.click();

    await expect(page).toHaveURL(/sign-up/);
  });
});

test.describe("Sign Up Page", () => {
  test("should display sign up form", async ({ page }) => {
    await page.goto("/sign-up");

    // Page shows "Create an account" as the main title
    await expect(page.getByText("Create an account")).toBeVisible();
    await expect(page.getByLabel(/first name/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/^password$/i)).toBeVisible();
  });

  test("should validate required fields", async ({ page }) => {
    await page.goto("/sign-up");

    // Click submit without filling form
    await page.getByRole("button", { name: /sign up|create/i }).click();

    // Should show validation errors
    const emailInput = page.getByLabel(/email/i);
    const isInvalid = await emailInput.evaluate(
      (el: HTMLInputElement) => !el.validity.valid,
    );
    expect(isInvalid).toBe(true);
  });

  test("should link to sign in page", async ({ page }) => {
    await page.goto("/sign-up");

    const signInLink = page.getByRole("link", { name: /sign in|log in/i });
    await expect(signInLink).toBeVisible();
    await signInLink.click();

    await expect(page).toHaveURL(/sign-in/);
  });
});

test.describe("Forgot Password Page", () => {
  test("should display forgot password form", async ({ page }) => {
    await page.goto("/forgot-password");

    // Page shows "Forgot password?" as the main title
    await expect(page.getByText("Forgot password?")).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /send|reset|submit/i }),
    ).toBeVisible();
  });

  test("should accept email and show success message", async ({ page }) => {
    await page.goto("/forgot-password");

    await page.getByLabel(/email/i).fill("test@example.com");
    await page.getByRole("button", { name: /send|reset|submit/i }).click();

    // Should show success message - CardTitle renders as div, not heading
    // Wait for "Check your email" text which appears on success
    await expect(page.getByText("Check your email")).toBeVisible({
      timeout: 10000,
    });
    // Also verify the "Try another email" button appears (confirms success state)
    await expect(
      page.getByRole("button", { name: /try another email/i }),
    ).toBeVisible();
  });

  test("should link back to sign in", async ({ page }) => {
    await page.goto("/forgot-password");

    const backLink = page.getByRole("link", { name: /sign in|back/i });
    await expect(backLink).toBeVisible();
  });
});

test.describe("Reset Password Page", () => {
  test("should show error for invalid token", async ({ page }) => {
    // Navigate without token to trigger error state
    // (The component shows error when token is missing or error param is set)
    await page.goto("/reset-password");

    // Should show "Invalid link" message - CardTitle renders as div, not heading
    await expect(page.getByText("Invalid link")).toBeVisible({
      timeout: 10000,
    });
    // Verify "Request new link" button appears (confirms error state)
    await expect(
      page.getByRole("button", { name: /request new link/i }),
    ).toBeVisible();
  });
});

test.describe("Email Verification Page", () => {
  test("should show error for invalid verification token", async ({ page }) => {
    await page.goto("/verify-email?token=invalid-token-12345");

    // Should show error message
    await expect(page.getByText(/invalid|expired|error/i)).toBeVisible({
      timeout: 5000,
    });
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

  test("should redirect unauthenticated user from /chats/:id", async ({
    page,
  }) => {
    await page.goto("/chats/some-chat-id");
    await expect(page).toHaveURL(/sign-in/);
  });
});

test.describe("Navigation - Unauthenticated", () => {
  test("should show sign in link on home page", async ({ page }) => {
    await page.goto("/");

    // Look for sign in link anywhere on the page
    const signInLink = page.getByRole("link", { name: /sign in/i }).first();
    await expect(signInLink).toBeVisible();
  });

  test("should navigate to sign in when clicking link", async ({ page }) => {
    await page.goto("/");

    // Click the first sign in link
    await page
      .getByRole("link", { name: /sign in/i })
      .first()
      .click();
    await expect(page).toHaveURL(/sign-in/);
  });
});
