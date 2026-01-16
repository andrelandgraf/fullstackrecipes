## Install Bun Types

Add Bun types for full TypeScript support in test files:

```bash
bun add -D @types/bun
```

---

## Folder Structure

Unit tests live alongside source code in `src/`:

```
src/
├── lib/
│   ├── common/
│   │   ├── assert.ts
│   │   └── assert.test.ts      # Unit test for assert
│   ├── config/
│   │   ├── schema.ts
│   │   └── schema.test.ts      # Unit test for config schema
│   └── ...
```

Tests use the `.test.ts` suffix and are co-located with the code they test.

---

## When to Write Unit Tests

Use unit tests for:

- Pure functions with complex logic (validation, parsing, transformation)
- Utility functions without external dependencies
- Code that needs type narrowing or error message verification
- Functions where behavior is not easily testable through integration or browser tests

**Avoid** unit tests when:

- The function has external dependencies (database, API calls)
- The behavior is better verified through integration tests
- The function is simple enough that bugs would be caught by TypeScript

---

## Writing Unit Tests

Create test files with the `.test.ts` suffix. Bun automatically discovers and runs them:

```typescript
import { describe, it, expect } from "bun:test";

describe("myFunction", () => {
  it("returns expected value", () => {
    expect(myFunction()).toBe("expected");
  });
});
```

---

## Example: Testing an Assertion Helper

Here's a complete test file for an assertion utility at `src/lib/common/assert.test.ts`:

```typescript
import { describe, it, expect, mock } from "bun:test";
import assert from "./assert";

describe("assert", () => {
  describe("truthy conditions", () => {
    it("does not throw for true", () => {
      expect(() => assert(true)).not.toThrow();
    });

    it("does not throw for truthy values", () => {
      expect(() => assert(1)).not.toThrow();
      expect(() => assert("string")).not.toThrow();
      expect(() => assert({})).not.toThrow();
      expect(() => assert([])).not.toThrow();
    });
  });

  describe("falsy conditions", () => {
    it("throws for false", () => {
      expect(() => assert(false)).toThrow();
    });

    it("throws for null", () => {
      expect(() => assert(null)).toThrow();
    });

    it("throws for undefined", () => {
      expect(() => assert(undefined)).toThrow();
    });
  });

  describe("error messages", () => {
    it("uses default message when none provided", () => {
      try {
        assert(false);
        expect.unreachable("Should have thrown");
      } catch (e) {
        expect((e as Error).message).toBe("Assertion failed");
      }
    });

    it("uses string message when provided", () => {
      try {
        assert(false, "Custom error message");
        expect.unreachable("Should have thrown");
      } catch (e) {
        expect((e as Error).message).toBe(
          "Assertion failed: Custom error message",
        );
      }
    });

    it("calls lazy function for message", () => {
      const messageFn = mock(() => "Lazy message");

      try {
        assert(false, messageFn);
        expect.unreachable("Should have thrown");
      } catch (e) {
        expect(messageFn).toHaveBeenCalled();
        expect((e as Error).message).toBe("Assertion failed: Lazy message");
      }
    });

    it("does not call lazy function when condition is truthy", () => {
      const messageFn = mock(() => "Should not be called");

      assert(true, messageFn);

      expect(messageFn).not.toHaveBeenCalled();
    });
  });

  describe("type narrowing", () => {
    it("narrows nullable types", () => {
      const value: string | null = "hello";
      assert(value !== null);
      expect(value.toUpperCase()).toBe("HELLO");
    });
  });
});
```

---

## Testing Patterns

**1. Testing thrown errors:**

```typescript
expect(() => throwingFunction()).toThrow(ErrorClass);

// Or with try/catch for message inspection
try {
  throwingFunction();
  expect.unreachable("Should have thrown");
} catch (e) {
  expect((e as Error).message).toContain("expected text");
}
```

**2. Using mocks:**

```typescript
import { mock } from "bun:test";

const mockFn = mock(() => "return value");
expect(mockFn).toHaveBeenCalled();
expect(mockFn).not.toHaveBeenCalled();
```

**3. Testing environment variables:**

```typescript
let originalEnv: NodeJS.ProcessEnv;

beforeEach(() => {
  originalEnv = { ...process.env };
});

afterEach(() => {
  process.env = originalEnv;
});
```

**4. Simulating client environment:**

```typescript
// @ts-expect-error - intentionally manipulating global for tests
globalThis.window = {};

// Clean up in afterEach
// @ts-expect-error
delete globalThis.window;
```

---

## Running Unit Tests

```bash
bun run test:unit               # Run unit tests with isolated Neon branch
bun test src                    # Run all unit tests directly
bun test src/lib/common         # Run tests in a directory
bun test src/lib/common/assert  # Run a specific test file
```

---

## CI with GitHub Actions

Run tests automatically on every push:

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches:
      - "**"
  pull_request:
    branches:
      - "**"

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Run unit tests
        run: bun test src
```
