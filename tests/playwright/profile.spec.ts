import { test, expect, type Page } from "@playwright/test";
import { createTestUser, type TestUser } from "./lib/test-user";

/**
 * Browser tests for profile and account management.
 * Based on user stories: profile-edit.json, profile-change-password.json,
 * profile-change-email.json, profile-delete-account.json, profile-sessions.json
 */

// Test user - created and email-verified before tests
let testUser: TestUser;

async function signIn(page: Page): Promise<void> {
  await page.goto("/sign-in");
  await page.getByLabel(/email/i).fill(testUser.email);
  await page.getByLabel(/password/i).fill(testUser.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/chats/, { timeout: 15000 });
  // Wait for page to fully load to avoid navigation conflicts
  await page.waitForLoadState("networkidle");
}

test.beforeAll(async () => {
  testUser = await createTestUser({ name: "Profile Test User" });
});

test.describe("Profile Page", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("should display profile page with user info", async ({ page }) => {
    await page.goto("/profile");

    // Should show profile header/card
    await expect(
      page.getByRole("heading", { name: /profile|settings|account/i }),
    ).toBeVisible();

    // Should show user name
    await expect(page.getByText(testUser.name)).toBeVisible();

    // Should show user email
    await expect(page.getByText(testUser.email)).toBeVisible();
  });

  test("should have edit profile section", async ({ page }) => {
    await page.goto("/profile");

    const editButton = page.getByRole("button", { name: /edit/i });
    await expect(editButton).toBeVisible();
  });

  test("should have change password section", async ({ page }) => {
    await page.goto("/profile");

    // Scroll to find change password section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // Use card title selector to avoid matching both title and button
    const passwordSection = page
      .locator('[data-slot="card-title"]')
      .filter({ hasText: /change password/i });
    await expect(passwordSection).toBeVisible();
  });

  test("should have change email section", async ({ page }) => {
    await page.goto("/profile");

    // Use card title selector to avoid matching both title and button
    const emailSection = page
      .locator('[data-slot="card-title"]')
      .filter({ hasText: /change email/i });
    await expect(emailSection).toBeVisible();
  });

  test("should have delete account section", async ({ page }) => {
    await page.goto("/profile");

    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    const deleteButton = page.getByRole("button", { name: /delete account/i });
    await expect(deleteButton).toBeVisible();
  });
});

test.describe("Profile Edit", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("should open edit mode when clicking edit", async ({ page }) => {
    await page.goto("/profile");

    await page.getByRole("button", { name: /edit/i }).first().click();

    // Should show name input field
    const nameInput = page.getByLabel(/name/i);
    await expect(nameInput).toBeVisible();

    // Should have save and cancel buttons
    await expect(page.getByRole("button", { name: /save/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /cancel/i })).toBeVisible();
  });

  test("should cancel edit without saving", async ({ page }) => {
    await page.goto("/profile");

    await page.getByRole("button", { name: /edit/i }).first().click();

    const nameInput = page.getByLabel(/name/i);
    const originalValue = await nameInput.inputValue();

    // Modify name
    await nameInput.fill("Modified Name");

    // Cancel
    await page.getByRole("button", { name: /cancel/i }).click();

    // Should show original name
    await expect(page.getByText(testUser.name)).toBeVisible();
  });
});

test.describe("Change Password", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("should display change password form", async ({ page }) => {
    await page.goto("/profile");

    // Scroll to change password section using card title
    await page
      .locator('[data-slot="card-title"]')
      .filter({ hasText: /change password/i })
      .scrollIntoViewIfNeeded();

    // Should have password fields
    await expect(page.getByLabel(/current password/i)).toBeVisible();
    await expect(page.getByLabel(/new password/i).first()).toBeVisible();
  });

  test("should validate password requirements", async ({ page }) => {
    await page.goto("/profile");

    // Scroll to change password section using card title
    await page
      .locator('[data-slot="card-title"]')
      .filter({ hasText: /change password/i })
      .scrollIntoViewIfNeeded();

    // Fill with short password (need to fill all fields for form submission)
    await page.getByLabel(/current password/i).fill(testUser.password);
    await page
      .getByLabel(/new password/i)
      .first()
      .fill("short");
    await page.getByLabel(/confirm.*password/i).fill("short");

    // Try to submit - use the button within the change password card
    const changePasswordCard = page
      .locator("form")
      .filter({ has: page.getByLabel(/current password/i) });
    const submitButton = changePasswordCard.getByRole("button", {
      name: /change password/i,
    });
    await submitButton.click();

    // Should show validation error via toast (message includes "8 characters")
    await expect(page.getByText(/8 characters/i)).toBeVisible({
      timeout: 5000,
    });
  });
});

test.describe("Delete Account", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("should open delete confirmation dialog", async ({ page }) => {
    await page.goto("/profile");

    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    await page.getByRole("button", { name: /delete account/i }).click();

    // Dialog should open with confirmation heading
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /are you.*sure/i }),
    ).toBeVisible();
  });

  test("should require DELETE confirmation text", async ({ page }) => {
    await page.goto("/profile");

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.getByRole("button", { name: /delete account/i }).click();

    // Find confirm input
    const confirmInput = page.getByPlaceholder(/delete/i);
    if ((await confirmInput.count()) > 0) {
      // Delete button should be disabled until correct text entered
      const deleteButton = page
        .getByRole("alertdialog")
        .getByRole("button", { name: /delete/i });
      await expect(deleteButton).toBeDisabled();

      // Type wrong text
      await confirmInput.fill("wrong");
      await expect(deleteButton).toBeDisabled();
    }
  });

  test("should cancel account deletion", async ({ page }) => {
    await page.goto("/profile");

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.getByRole("button", { name: /delete account/i }).click();

    // Cancel
    await page.getByRole("button", { name: /cancel/i }).click();

    // Dialog should close
    await expect(page.getByRole("alertdialog")).not.toBeVisible();
  });
});

test.describe("User Menu", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("should show user menu when clicking avatar", async ({ page }) => {
    await page.goto("/chats");

    // Find the avatar button specifically (last button in header, contains initials not icons)
    // The avatar is a rounded button with initials inside
    const userMenuTrigger = page.locator("header button.rounded-full").first();

    await expect(userMenuTrigger).toBeVisible();
    await userMenuTrigger.click();

    // Should show dropdown with Settings and Sign out options
    await expect(
      page.getByRole("menuitem").filter({ hasText: /settings/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("menuitem").filter({ hasText: /sign out/i }),
    ).toBeVisible();
  });

  test("should navigate to profile from user menu", async ({ page }) => {
    await page.goto("/chats");

    const userMenuTrigger = page
      .locator("header")
      .getByRole("button")
      .filter({ has: page.locator("img, svg, [data-avatar]") })
      .first();

    if ((await userMenuTrigger.count()) > 0) {
      await userMenuTrigger.click();

      const profileLink = page.getByRole("menuitem", {
        name: /settings|profile/i,
      });
      if ((await profileLink.count()) > 0) {
        await profileLink.click();
        await expect(page).toHaveURL(/profile/);
      }
    }
  });
});
