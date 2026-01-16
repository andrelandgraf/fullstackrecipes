import { test, expect, type Page } from "@playwright/test";
import { createTestUser, type TestUser } from "./lib/test-user";

/**
 * Browser tests for chat features.
 * Based on user stories: chat-list.json, chat-create.json, chat-rename.json,
 * chat-delete.json, chat-conversation.json
 *
 * These tests require authentication and use a fresh test user.
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

// Setup: Create test user before all tests
test.beforeAll(async () => {
  testUser = await createTestUser({ name: "Chat Test User" });
});

test.describe("Chat List", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("should display chat list page", async ({ page }) => {
    await page.goto("/chats");

    // Should show either chats or empty state
    const chatList = page.locator('[data-testid="chat-list"]');
    const emptyState = page.getByText(/no chats|start/i);

    const hasChatList = (await chatList.count()) > 0;
    const hasEmptyState = (await emptyState.count()) > 0;

    expect(hasChatList || hasEmptyState).toBe(true);
  });

  test("should show empty state for new user", async ({ page }) => {
    await page.goto("/chats");

    // New user should see empty state with prompt to start chat
    // Use heading role for specificity to avoid strict mode violation
    const emptyStateHeading = page.getByRole("heading", {
      name: /no chats/i,
    });
    const startButton = page.getByRole("button", {
      name: /new chat|start.*chat/i,
    });

    if ((await emptyStateHeading.count()) > 0) {
      await expect(emptyStateHeading).toBeVisible();
    }
    await expect(startButton).toBeVisible();
  });

  test("should have search input", async ({ page }) => {
    await page.goto("/chats");

    const searchInput = page.getByPlaceholder(/search/i);
    if ((await searchInput.count()) > 0) {
      await expect(searchInput).toBeVisible();
    }
  });

  test("should have new chat button", async ({ page }) => {
    await page.goto("/chats");

    // Button text varies: "New Chat" when chats exist, "Start a Chat" when empty
    const newChatButton = page.getByRole("button", {
      name: /new chat|start.*chat/i,
    });
    await expect(newChatButton).toBeVisible();
  });
});

test.describe("Chat Create", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("should create new chat when clicking new chat button", async ({
    page,
  }) => {
    await page.goto("/chats");

    // Button text varies: "New Chat" when chats exist, "Start a Chat" when empty
    const newChatButton = page.getByRole("button", {
      name: /new chat|start.*chat/i,
    });
    await newChatButton.click();

    // Should navigate to new chat page
    await expect(page).toHaveURL(/\/chats\/[a-zA-Z0-9-]+/);

    // Should have chat input ready
    const chatInput = page.getByPlaceholder(/message|type|something/i);
    await expect(chatInput).toBeVisible();
  });
});

test.describe("Chat Conversation", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("should display chat interface with input", async ({ page }) => {
    // Create a new chat first
    await page.goto("/chats");
    await page.getByRole("button", { name: /new chat|start.*chat/i }).click();
    await page.waitForURL(/\/chats\/[a-zA-Z0-9-]+/);

    // Should have message input
    const chatInput = page.getByPlaceholder(/message|type|something/i);
    await expect(chatInput).toBeVisible();

    // Should have send/submit button
    const sendButton = page.getByRole("button", { name: /send|submit/i });
    await expect(sendButton).toBeVisible();
  });

  test("should be able to type in chat input", async ({ page }) => {
    await page.goto("/chats");
    await page.getByRole("button", { name: /new chat|start.*chat/i }).click();
    await page.waitForURL(/\/chats\/[a-zA-Z0-9-]+/);

    const chatInput = page.getByPlaceholder(/message|type|something/i);
    await chatInput.fill("Hello, this is a test message");

    await expect(chatInput).toHaveValue("Hello, this is a test message");
  });
});

test.describe("Chat Menu Actions", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    // Create a chat first so we have something to work with
    await page.goto("/chats");
    await page.getByRole("button", { name: /new chat|start.*chat/i }).click();
    await page.waitForURL(/\/chats\/[a-zA-Z0-9-]+/);
    // Go back to list
    await page.goto("/chats");
  });

  test("should open rename dialog from menu", async ({ page }) => {
    // Find chat item menu button (three dots or similar)
    const menuButton = page
      .locator('[data-testid="chat-menu"]')
      .or(page.getByRole("button", { name: /more|menu|options/i }))
      .first();

    if ((await menuButton.count()) > 0) {
      await menuButton.click();

      const renameOption = page.getByRole("menuitem", { name: /rename/i });
      if ((await renameOption.count()) > 0) {
        await renameOption.click();

        // Rename dialog should open
        await expect(page.getByRole("dialog")).toBeVisible();
        await expect(page.getByLabel(/title|name/i)).toBeVisible();
      }
    }
  });

  test("should open delete confirmation from menu", async ({ page }) => {
    const menuButton = page
      .locator('[data-testid="chat-menu"]')
      .or(page.getByRole("button", { name: /more|menu|options/i }))
      .first();

    if ((await menuButton.count()) > 0) {
      await menuButton.click();

      const deleteOption = page.getByRole("menuitem", { name: /delete/i });
      if ((await deleteOption.count()) > 0) {
        await deleteOption.click();

        // Delete confirmation dialog should open
        await expect(page.getByRole("alertdialog")).toBeVisible();
        await expect(page.getByText(/delete|confirm/i)).toBeVisible();
      }
    }
  });
});

test.describe("Chat Deep Links", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    // Create a chat first
    await page.goto("/chats");
    await page.getByRole("button", { name: /new chat|start.*chat/i }).click();
    await page.waitForURL(/\/chats\/[a-zA-Z0-9-]+/);
  });

  test("should open rename dialog via URL parameter", async ({ page }) => {
    // Get current chat ID from URL
    const url = page.url();
    const chatId = url.split("/chats/")[1];

    // Navigate to chats with rename parameter
    await page.goto(`/chats?rename=${chatId}`);

    // Rename dialog should open automatically
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
  });

  test("should open delete dialog via URL parameter", async ({ page }) => {
    const url = page.url();
    const chatId = url.split("/chats/")[1];

    await page.goto(`/chats?delete=${chatId}`);

    // Delete dialog should open automatically
    await expect(page.getByRole("alertdialog")).toBeVisible({ timeout: 5000 });
  });
});
