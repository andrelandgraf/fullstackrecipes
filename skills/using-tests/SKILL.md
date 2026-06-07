---
name: using-tests
description: Choose and write the right test type (Playwright > integration > unit) against isolated Neon branches. Use when adding, running, or debugging tests for a feature.
---

# Working with Tests

Choose the right test type, isolate data per suite, and run against a disposable Neon branch.

## Prerequisites

Complete these setup recipes first:

- Browser Tests with Playwright
- Integration Tests
- Unit Tests with Bun

### Choosing a Test Type

Ask "how would a user verify this works?" and pick the highest applicable tier:

1. **Playwright** (default) — UI interactions, visual feedback, form validation, multi-step flows, protected routes, accessibility.
2. **Integration** — API responses (status, JSON shape), DB state after operations, server logic without UI, or when Playwright is too slow/complex.
3. **Unit** — pure functions with complex logic, many edge cases, or type narrowing/assertions with no external dependencies.

### Running

All tests run against an isolated, schema-only Neon branch that auto-deletes after 1 hour.

```bash
bun run test              # all tests
bun run test:playwright   # browser only
bun run test:integration  # integration only
bun run test:unit         # unit only
```

### Folder Structure

Unit tests are co-located; Playwright and integration tests live under `tests/`.

```
src/lib/<domain>/<file>.test.ts   # unit (co-located)
tests/integration/<feature>.test.ts
tests/playwright/<feature>.spec.ts
tests/playwright/lib/                # Playwright helpers
```

### Writing Tests

Playwright spec:

```typescript
import { test, expect } from "@playwright/test";

test.describe("Feature Name", () => {
  test("should do expected behavior", async ({ page }) => {
    await page.goto("/feature");
  });
});
```

Integration — import the route handler directly instead of going over HTTP:

```typescript
import { describe, it, expect } from "bun:test";
import { GET } from "@/app/api/feature/route";

describe("GET /api/feature", () => {
  it("returns expected response", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.value).toBeDefined();
  });
});
```

Unit (co-located):

```typescript
import { describe, it, expect } from "bun:test";
import { myFunction } from "./my-file";

describe("myFunction", () => {
  it("returns expected value", () => {
    expect(myFunction()).toBe("expected");
  });
});
```

### Test Data Isolation

Tests run in parallel against the shared branch, so each suite must own its data. Generate unique users per spec (e.g. `auth-test-${uuid}@example.com`), avoid shared resources, and rely on the branch TTL for cleanup — never assume data from another test exists.

```typescript
const testUser = await createTestUser({
  email: `auth-test-${uuid}@example.com`,
});
```

### Common Patterns

```typescript
// Protected route (Playwright)
test("redirects unauthenticated user", async ({ page }) => {
  await page.goto("/protected-page");
  await expect(page).toHaveURL(/sign-in/);
});

// Error state (Playwright)
test("shows error for invalid input", async ({ page }) => {
  await page.goto("/form");
  await page.getByRole("button", { name: /submit/i }).click();
  await expect(page.getByText(/error|required/i)).toBeVisible({
    timeout: 5000,
  });
});
```

### Debugging

```bash
bunx playwright test --headed     # watch the browser
bunx playwright test --debug      # step through
bunx playwright show-report       # HTML report

bun test --only "test name"       # run a single test
bun test --watch                  # re-run on change
```

Failed Playwright runs save screenshots and traces to `test-results/` — check there when CI fails.
