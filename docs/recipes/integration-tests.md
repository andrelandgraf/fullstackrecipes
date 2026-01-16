## Folder Structure

Integration tests live in `tests/integration/` and test pure API endpoints:

```
tests/
├── integration/
│   ├── llms.test.ts              # /llms.txt endpoint tests
│   ├── mcp/
│   │   └── route.test.ts         # MCP server endpoint tests
│   ├── r.test.ts                 # Shadcn registry tests
│   └── recipes/
│       └── [slug]/
│           └── route.test.ts     # Recipe API tests
```

---

## When to Write Integration Tests

Use integration tests for:

- API routes and endpoints that don't require authentication
- Public endpoints (e.g., /llms.txt, /api/mcp, /api/recipes/[slug])
- Testing JSON-RPC or other protocol-level interactions

**Use Playwright tests** for:

- User interactions (clicking, typing, navigation)
- Visual feedback (toasts, loading states, error messages)
- Complex UI flows
- Authentication flows (sign-in, sign-up, sign-out)
- Any feature that requires a logged-in user

---

## Writing Integration Tests

### Direct Handler Import (Preferred)

Import route handlers directly for faster, more reliable tests without HTTP overhead:

```typescript
import { describe, it, expect } from "bun:test";
import { GET } from "@/app/llms.txt/route";

describe("GET /llms.txt", () => {
  it("should return 200 with plain text content type", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe(
      "text/plain; charset=utf-8",
    );
  });

  it("should return non-empty content", async () => {
    const response = await GET();
    const content = await response.text();

    expect(content.length).toBeGreaterThan(0);
    expect(content).toContain("# Fullstack Recipes");
  });
});
```

### Testing with Data Dependencies

When tests need to verify content from application data, import and use the same data sources:

```typescript
import { describe, it, expect } from "bun:test";
import { GET } from "@/app/llms.txt/route";
import { getAllRecipes } from "@/lib/recipes/data";

describe("content includes all recipes", () => {
  const recipes = getAllRecipes();

  for (const recipe of recipes) {
    it(`should include recipe "${recipe.title}"`, async () => {
      const response = await GET();
      const content = await response.text();

      expect(content).toContain(recipe.title);
      expect(content).toContain(`/recipes/${recipe.slug}`);
    });
  }
});
```

---

## Running Integration Tests

```bash
bun run test:integration  # Run all integration tests
```

The test script creates an isolated Neon database branch, runs tests, then cleans up.

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

      - name: Run integration tests
        run: bun run test:integration
```

Note: Integration tests require the Neon API credentials to create test branches. Add `NEON_API_KEY` and `NEON_PROJECT_ID` as repository secrets.
