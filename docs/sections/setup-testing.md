## Testing with Bun

Bun has a built-in test runner that's fast and compatible with Jest-like syntax. No additional test framework needed.

### Install Bun Types

Add Bun types for full TypeScript support in test files:

```bash
bun add -D @types/bun
```

### Add Test Script

Add a test script to your `package.json`:

```json
{
  "scripts": {
    "test": "bun test"
  }
}
```

### Writing Tests

Create test files with the `.test.ts` suffix. Bun automatically discovers and runs them:

```typescript
import { describe, it, expect } from "bun:test";

describe("myFunction", () => {
  it("returns expected value", () => {
    expect(myFunction()).toBe("expected");
  });
});
```

### Running Tests

```bash
bun test                    # Run all tests
bun test src/lib/common     # Run tests in a directory
bun test specific.test.ts   # Run a specific test file
```

---

### Example: Testing an Assertion Helper

Here's a complete test file for an assertion utility:

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

    it("throws for 0", () => {
      expect(() => assert(0)).toThrow();
    });

    it("throws for empty string", () => {
      expect(() => assert("")).toThrow();
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
      // TypeScript now knows value is string
      expect(value.toUpperCase()).toBe("HELLO");
    });

    it("narrows undefined types", () => {
      const value: number | undefined = 42;
      assert(value !== undefined);
      // TypeScript now knows value is number
      expect(value.toFixed(2)).toBe("42.00");
    });
  });
});
```

---

### Example: Testing Environment Config

Testing code that depends on `process.env` requires saving and restoring the original environment:

```typescript
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { z } from "zod";
import {
  loadConfig,
  InvalidConfigurationError,
  ServerConfigClientAccessError,
} from "./load-config";

// Store original env to restore after tests
let originalEnv: NodeJS.ProcessEnv;

beforeEach(() => {
  originalEnv = { ...process.env };
});

afterEach(() => {
  // Restore original env
  process.env = originalEnv;
  // Reset window (in case we simulated client)
  // @ts-expect-error - intentionally manipulating global for tests
  delete globalThis.window;
});

describe("loadConfig", () => {
  describe("server section", () => {
    it("loads string values", () => {
      const config = loadConfig({
        server: {
          url: "postgres://localhost:5432/test",
        },
      });

      expect(config.server.url).toBe("postgres://localhost:5432/test");
    });

    it("throws when required value is undefined", () => {
      expect(() =>
        loadConfig({
          server: {
            url: undefined,
          },
        }),
      ).toThrow(InvalidConfigurationError);
    });

    it("includes key path in error message", () => {
      try {
        loadConfig({
          server: {
            secretKey: undefined,
          },
        });
        expect.unreachable("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(InvalidConfigurationError);
        expect((e as Error).message).toContain(
          "server.secretKey must be defined",
        );
      }
    });

    it("includes feature name in error message when provided", () => {
      try {
        loadConfig({
          name: "Stripe",
          server: {
            apiKey: undefined,
          },
        });
        expect.unreachable("Should have thrown");
      } catch (e) {
        expect((e as Error).message).toContain("for Stripe");
      }
    });
  });

  describe("public section", () => {
    it("loads string values", () => {
      const config = loadConfig({
        public: {
          dsn: "https://sentry.io/123",
        },
      });

      expect(config.public.dsn).toBe("https://sentry.io/123");
    });

    it("throws when required value is undefined", () => {
      expect(() =>
        loadConfig({
          public: {
            dsn: undefined,
          },
        }),
      ).toThrow(InvalidConfigurationError);
    });
  });

  describe("custom schemas", () => {
    it("coerces string to number", () => {
      const config = loadConfig({
        server: {
          port: { value: "3000", schema: z.coerce.number() },
        },
      });

      expect(config.server.port).toBe(3000);
      expect(typeof config.server.port).toBe("number");
    });

    it("uses default value when undefined", () => {
      const config = loadConfig({
        server: {
          poolSize: { value: undefined, schema: z.coerce.number().default(10) },
        },
      });

      expect(config.server.poolSize).toBe(10);
    });

    it("allows optional values with schema", () => {
      const config = loadConfig({
        server: {
          optional: { value: undefined, schema: z.string().optional() },
        },
      });

      expect(config.server.optional).toBeUndefined();
    });

    it("validates with custom schema and shows error", () => {
      try {
        loadConfig({
          public: {
            email: {
              value: "invalid-email",
              schema: z.string().email("Must be a valid email"),
            },
          },
        });
        expect.unreachable("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(InvalidConfigurationError);
        expect((e as Error).message).toContain("public.email is invalid");
      }
    });
  });

  describe("feature flags", () => {
    it("returns isEnabled: false when flag is undefined", () => {
      const config = loadConfig({
        flag: undefined,
        server: {
          apiKey: "key",
        },
      });

      expect(config.isEnabled).toBe(false);
    });

    it("returns isEnabled: false when flag is 'false'", () => {
      const config = loadConfig({
        flag: "false",
        server: {
          apiKey: "key",
        },
      });

      expect(config.isEnabled).toBe(false);
    });

    it("validates and returns config when flag is 'true'", () => {
      const config = loadConfig({
        flag: "true",
        server: {
          apiKey: "secret-key",
        },
      });

      expect(config.isEnabled).toBe(true);
      if (config.isEnabled) {
        expect(config.server.apiKey).toBe("secret-key");
      }
    });

    it("accepts '1' and 'yes' as truthy flag values", () => {
      for (const value of ["1", "yes", "YES", "True", "TRUE"]) {
        const config = loadConfig({
          flag: value,
          server: {
            apiKey: "test",
          },
        });

        expect(config.isEnabled).toBe(true);
      }
    });

    it("throws when flag is enabled but value is undefined", () => {
      expect(() =>
        loadConfig({
          flag: "true",
          server: {
            apiKey: undefined,
          },
        }),
      ).toThrow(InvalidConfigurationError);
    });

    it("skips validation when flag is disabled", () => {
      // Should NOT throw even though apiKey is undefined
      const config = loadConfig({
        flag: undefined,
        server: {
          apiKey: undefined,
        },
      });

      expect(config.isEnabled).toBe(false);
    });
  });

  describe("client-side proxy protection", () => {
    it("allows access to public vars on client", () => {
      // Simulate client environment
      // @ts-expect-error - intentionally manipulating global for tests
      globalThis.window = {};

      const config = loadConfig({
        public: {
          dsn: "https://sentry.io/123",
        },
      });

      // Should not throw
      expect(config.public.dsn).toBe("https://sentry.io/123");
    });

    it("throws when accessing server var on client", () => {
      // Simulate client environment
      // @ts-expect-error - intentionally manipulating global for tests
      globalThis.window = {};

      const config = loadConfig({
        server: {
          token: "super-secret",
        },
      });

      expect(() => config.server.token).toThrow(ServerConfigClientAccessError);
    });

    it("includes key name in client access error", () => {
      // @ts-expect-error - intentionally manipulating global for tests
      globalThis.window = {};

      const config = loadConfig({
        server: {
          authToken: "secret",
        },
      });

      try {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        config.server.authToken;
        expect.unreachable("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(ServerConfigClientAccessError);
        expect((e as Error).message).toContain("server.authToken");
      }
    });

    it("allows isEnabled access on client", () => {
      // @ts-expect-error - intentionally manipulating global for tests
      globalThis.window = {};

      const config = loadConfig({
        flag: "true",
        public: {
          key: "public-value",
        },
      });

      // Should not throw when accessing isEnabled
      expect(config.isEnabled).toBe(true);
    });

    it("does not use proxy on server (no window)", () => {
      // Ensure window is undefined (server)
      // @ts-expect-error - intentionally manipulating global for tests
      delete globalThis.window;

      const config = loadConfig({
        server: {
          token: "super-secret",
        },
      });

      // Should work fine on server
      expect(config.server.token).toBe("super-secret");
    });
  });

  describe("mixed public and server on client", () => {
    it("allows public and blocks server on client", () => {
      // @ts-expect-error - intentionally manipulating global for tests
      globalThis.window = {};

      const config = loadConfig({
        server: {
          token: "secret",
        },
        public: {
          dsn: "https://sentry.io",
        },
      });

      // Public works
      expect(config.public.dsn).toBe("https://sentry.io");

      // Server throws
      expect(() => config.server.token).toThrow(ServerConfigClientAccessError);
    });
  });
});
```

### Testing Patterns

**1. Testing environment variables:**

```typescript
let originalEnv: NodeJS.ProcessEnv;

beforeEach(() => {
  originalEnv = { ...process.env };
});

afterEach(() => {
  process.env = originalEnv;
});
```

**2. Simulating client environment:**

```typescript
// @ts-expect-error - intentionally manipulating global for tests
globalThis.window = {};

// Clean up in afterEach
// @ts-expect-error
delete globalThis.window;
```

**3. Using mocks:**

```typescript
import { mock } from "bun:test";

const mockFn = mock(() => "return value");
expect(mockFn).toHaveBeenCalled();
expect(mockFn).not.toHaveBeenCalled();
```

**4. Testing thrown errors:**

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

---

## CI with GitHub Actions

Run tests automatically on every push and pull request using GitHub Actions.

### Create Workflow File

Create the GitHub Actions workflow:

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

      - name: Run tests
        run: bun test
```

This workflow:

- Triggers on push to any branch
- Triggers on pull requests to any branch
- Uses the official `oven-sh/setup-bun` action for fast Bun installation
- Uses `--frozen-lockfile` to ensure reproducible installs
- Runs all tests with `bun test`
