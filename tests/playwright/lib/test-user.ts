import type { Page } from "@playwright/test";
import { v4 as uuidv4 } from "uuid";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq } from "drizzle-orm";
import { users } from "@/lib/auth/schema";
import { config } from "dotenv";

// Load environment variables from .env files
// This ensures DATABASE_URL is available for email verification
config({ path: ".env.development" });
config({ path: ".env.local", override: true });

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

// Database connection for email verification
const connectionString = process.env.DATABASE_URL;
let db: ReturnType<typeof drizzle> | null = null;

function getDb() {
  if (!db && connectionString) {
    const pool = new Pool({ connectionString });
    db = drizzle({ client: pool });
  }
  return db;
}

export type TestUser = {
  id: string;
  email: string;
  name: string;
  password: string;
};

/**
 * Create a test user via the Better Auth API and verify their email.
 * This is done via fetch, not through the browser UI, for speed.
 */
export async function createTestUser(
  overrides: Partial<Omit<TestUser, "id">> = {},
): Promise<TestUser> {
  const uniqueId = uuidv4().slice(0, 8);
  const email = overrides.email || `test-${uniqueId}@example.com`;
  const name = overrides.name || "Test User";
  const password = overrides.password || "testpassword123";

  // Sign up via API
  const signUpRes = await fetch(`${BASE_URL}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  });

  if (!signUpRes.ok) {
    const text = await signUpRes.text();
    throw new Error(`Failed to create test user: ${signUpRes.status} ${text}`);
  }

  const signUpData = await signUpRes.json();
  const userId = signUpData.user.id;

  // Mark email as verified so the user can sign in
  const database = getDb();
  if (database) {
    await database
      .update(users)
      .set({ emailVerified: true })
      .where(eq(users.id, userId));
  }

  return { id: userId, email, name, password };
}

/**
 * Sign in a test user via the browser UI
 */
export async function signInWithBrowser(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto("/sign-in");

  // Fill in credentials
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);

  // Submit
  await page.getByRole("button", { name: /sign in/i }).click();

  // Wait for redirect to /chats
  await page.waitForURL(/\/chats/, { timeout: 10000 });
}

/**
 * Sign out via the browser UI
 */
export async function signOutWithBrowser(page: Page): Promise<void> {
  // Click user menu
  const userMenu = page
    .locator('[data-user-menu], [aria-label*="user"]')
    .first();
  if ((await userMenu.count()) > 0) {
    await userMenu.click();
  } else {
    // Try finding avatar button
    const avatar = page.locator("header button").filter({ hasText: "" }).last();
    await avatar.click();
  }

  // Click sign out
  await page.getByRole("menuitem", { name: /sign out/i }).click();

  // Wait for redirect
  await page.waitForURL("/");
}

/**
 * Check if currently signed in
 */
export async function isSignedIn(page: Page): Promise<boolean> {
  // Check for user menu or sign-in button
  const signInButton = page.getByRole("link", { name: /sign in/i });
  return (await signInButton.count()) === 0;
}
