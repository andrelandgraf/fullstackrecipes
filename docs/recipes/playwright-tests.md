## Install Playwright

Install Playwright as a dev dependency:

```bash
bun add -D @playwright/test
```

Install browsers (run once):

```bash
bunx playwright install chromium
```

---

## Update .gitignore

Add Playwright output directories to `.gitignore`:

```gitignore
# Playwright
test-results/
playwright-report/
```

These directories contain screenshots, traces, and HTML reports generated during test runs.

---

## Folder Structure

Playwright tests live in `tests/playwright/` and are organized by feature:

```
tests/
├── playwright/
│   ├── auth.spec.ts            # Authentication flow tests
│   ├── chat.spec.ts            # Chat feature tests
│   ├── home.spec.ts            # Homepage tests
│   ├── profile.spec.ts         # Profile page tests
│   ├── errors.spec.ts          # Error page tests
│   └── lib/
│       └── test-user.ts        # Playwright-specific test helpers
```

Playwright tests use the `.spec.ts` suffix to distinguish them from Bun tests.

---

## When to Write Playwright Tests

Playwright tests are the **preferred testing method** for features that involve:

- User interactions (clicking, typing, form submission)
- Visual feedback (toasts, loading states, modals)
- Navigation and URL changes
- Complex multi-step UI flows
- Accessibility testing (via Playwright's accessibility tree)

**Use integration tests instead** when:

- Testing API responses only (no UI)
- Verifying database state after operations
- Testing internal server logic

---

## Playwright Configuration

Create `playwright.config.ts`:

```typescript
import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for browser tests.
 *
 * Tests run against the server at TEST_BASE_URL (default: http://localhost:3000).
 * When running via `bun run test`, the test-with-branch.ts script starts
 * a test server with a fresh database branch.
 */

const baseURL = process.env.TEST_BASE_URL || "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/playwright",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Don't start dev server - test-with-branch.ts handles this
  webServer: undefined,
});
```

---

## Test Helpers

Create `tests/playwright/lib/test-user.ts` for browser-based authentication:

```typescript
import type { Page } from "@playwright/test";
import { v4 as uuidv4 } from "uuid";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

export type TestUser = {
  id: string;
  email: string;
  name: string;
  password: string;
};

/**
 * Create a test user via the Better Auth API.
 * Uses fetch for speed (faster than browser UI).
 */
export async function createTestUser(
  overrides: Partial<Omit<TestUser, "id">> = {},
): Promise<TestUser> {
  const uniqueId = uuidv4().slice(0, 8);
  const email = overrides.email || `test-${uniqueId}@example.com`;
  const name = overrides.name || "Test User";
  const password = overrides.password || "testpassword123";

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

  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();

  await page.waitForURL(/\/chats/, { timeout: 10000 });
}

/**
 * Sign out via the browser UI
 */
export async function signOutWithBrowser(page: Page): Promise<void> {
  const userMenu = page
    .locator('[data-user-menu], [aria-label*="user"]')
    .first();
  if ((await userMenu.count()) > 0) {
    await userMenu.click();
  } else {
    const avatar = page.locator("header button").last();
    await avatar.click();
  }

  await page.getByRole("menuitem", { name: /sign out/i }).click();
  await page.waitForURL("/");
}

/**
 * Check if currently signed in
 */
export async function isSignedIn(page: Page): Promise<boolean> {
  const signInButton = page.getByRole("link", { name: /sign in/i });
  return (await signInButton.count()) === 0;
}
```

---

## Writing Playwright Tests

### Example: Homepage Tests

Create `tests/playwright/home.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test.describe("Hero Section", () => {
    test("should display hero title and description", async ({ page }) => {
      await page.goto("/");

      await expect(
        page.getByRole("heading", { name: /My App/i }).first(),
      ).toBeVisible();
    });

    test("should have working CTA button", async ({ page }) => {
      await page.goto("/");

      const ctaButton = page.getByRole("link", { name: /Get Started/i });
      await expect(ctaButton).toBeVisible();
      await ctaButton.click();

      await expect(page).toHaveURL(/sign-up/);
    });
  });

  test.describe("Theme Toggle", () => {
    test("should toggle between light and dark theme", async ({ page }) => {
      await page.goto("/");

      const themeToggle = page.getByRole("button", { name: /toggle theme/i });
      await expect(themeToggle).toBeVisible();

      await themeToggle.click();

      const darkOption = page.getByRole("menuitem", { name: /dark/i });
      if ((await darkOption.count()) > 0) {
        await darkOption.click();
        await page.waitForTimeout(100);

        const html = page.locator("html");
        const newClass = await html.getAttribute("class");
        expect(newClass).toContain("dark");
      }
    });
  });
});
```

### Example: Authentication Tests

Create `tests/playwright/auth.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";

test.describe("Sign In Page", () => {
  test("should display sign in form", async ({ page }) => {
    await page.goto("/sign-in");

    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("should validate required fields", async ({ page }) => {
    await page.goto("/sign-in");

    await page.getByRole("button", { name: /sign in/i }).click();

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
});
```

---

## Testing Patterns

**1. Wait for navigation:**

```typescript
await page.goto("/some-page");
await expect(page).toHaveURL(/expected-url/);
```

**2. Click and verify dialog:**

```typescript
await page.getByRole("button", { name: /delete/i }).click();
await expect(page.getByRole("dialog")).toBeVisible();
await expect(page.getByText(/confirm/i)).toBeVisible();
```

**3. Form validation:**

```typescript
const emailInput = page.getByLabel(/email/i);
const isInvalid = await emailInput.evaluate(
  (el: HTMLInputElement) => !el.validity.valid,
);
expect(isInvalid).toBe(true);
```

**4. Conditional element checks:**

```typescript
const element = page.getByRole("button", { name: /optional/i });
if ((await element.count()) > 0) {
  await expect(element).toBeVisible();
}
```

**5. Wait for async content:**

```typescript
await expect(page.getByText(/loading complete/i)).toBeVisible({
  timeout: 5000,
});
```

---

## Running Playwright Tests

```bash
bun run test:playwright                 # Run with isolated Neon branch
bunx playwright test                    # Run all Playwright tests directly
bunx playwright test auth.spec.ts       # Run a specific test file
bunx playwright test --headed           # Run with browser visible
bunx playwright test --ui               # Open interactive UI
bunx playwright show-report             # View last test report
```

---

## CI with GitHub Actions

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: ["**"]
  pull_request:
    branches: ["**"]

jobs:
  test:
    runs-on: ubuntu-latest

    env:
      NEON_API_KEY: ${{ secrets.NEON_API_KEY }}
      NEON_PROJECT_ID: ${{ secrets.NEON_PROJECT_ID }}

    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - run: bun install --frozen-lockfile

      - name: Install Playwright browsers
        run: bunx playwright install chromium --with-deps

      - name: Run Playwright tests
        run: bun run test:playwright

      - name: Upload test artifacts
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: |
            playwright-report/
            test-results/
          retention-days: 7
```

The `--with-deps` flag installs system dependencies needed by Chromium on Ubuntu.
