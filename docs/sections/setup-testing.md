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
  configSchema,
  server,
  pub,
  oneOf,
  InvalidConfigurationError,
  ServerConfigClientAccessError,
} from "./schema";

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

describe("configSchema", () => {
  describe("server section", () => {
    it("loads string values", () => {
      const config = configSchema("Test", {
        url: server({ env: "URL", value: "postgres://localhost:5432/test" }),
      });

      expect(config.server.url).toBe("postgres://localhost:5432/test");
    });

    it("throws when required value is undefined", () => {
      expect(() =>
        configSchema("Test", {
          url: server({ env: "URL", value: undefined }),
        }),
      ).toThrow(InvalidConfigurationError);
    });

    it("includes key path and env name in error message", () => {
      try {
        configSchema("Test", {
          secretKey: server({ env: "SECRET_KEY", value: undefined }),
        });
        expect.unreachable("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(InvalidConfigurationError);
        expect((e as Error).message).toContain(
          "server.secretKey (SECRET_KEY) must be defined",
        );
      }
    });

    it("includes schema name in error message when provided", () => {
      try {
        configSchema("Stripe", {
          apiKey: server({ env: "API_KEY", value: undefined }),
        });
        expect.unreachable("Should have thrown");
      } catch (e) {
        expect((e as Error).message).toContain("for Stripe");
      }
    });
  });

  describe("public section", () => {
    it("loads string values", () => {
      const config = configSchema("Test", {
        dsn: pub({
          env: "NEXT_PUBLIC_DSN",
          value: "https://sentry.io/123",
        }),
      });

      expect(config.public.dsn).toBe("https://sentry.io/123");
    });

    it("throws when required value is undefined", () => {
      expect(() =>
        configSchema("Test", {
          dsn: pub({ env: "NEXT_PUBLIC_DSN", value: undefined }),
        }),
      ).toThrow(InvalidConfigurationError);
    });
  });

  describe("custom schemas", () => {
    it("coerces string to number", () => {
      const config = configSchema("Test", {
        port: server({ env: "PORT", value: "3000", schema: z.coerce.number() }),
      });

      expect(config.server.port).toBe(3000);
      expect(typeof config.server.port).toBe("number");
    });

    it("uses default value when undefined", () => {
      const config = configSchema("Test", {
        poolSize: server({
          env: "POOL_SIZE",
          value: undefined,
          schema: z.coerce.number().default(10),
        }),
      });

      expect(config.server.poolSize).toBe(10);
    });

    it("allows optional values with schema", () => {
      const config = configSchema("Test", {
        optional: server({
          env: "OPTIONAL",
          value: undefined,
          schema: z.string().optional(),
        }),
      });

      expect(config.server.optional).toBeUndefined();
    });

    it("validates with custom schema and shows error", () => {
      try {
        configSchema("Test", {
          email: pub({
            env: "NEXT_PUBLIC_EMAIL",
            value: "invalid-email",
            schema: z.string().email("Must be a valid email"),
          }),
        });
        expect.unreachable("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(InvalidConfigurationError);
        expect((e as Error).message).toContain(
          "public.email (NEXT_PUBLIC_EMAIL) is invalid",
        );
      }
    });
  });

  describe("feature flags", () => {
    it("returns isEnabled: false when flag value is undefined", () => {
      const config = configSchema(
        "Test",
        {
          apiKey: server({ env: "API_KEY", value: "key" }),
        },
        {
          flag: { env: "ENABLE_FEATURE", value: undefined },
        },
      );

      expect(config.isEnabled).toBe(false);
    });

    it("returns isEnabled: false when flag value is 'false'", () => {
      const config = configSchema(
        "Test",
        {
          apiKey: server({ env: "API_KEY", value: "key" }),
        },
        {
          flag: { env: "ENABLE_FEATURE", value: "false" },
        },
      );

      expect(config.isEnabled).toBe(false);
    });

    it("validates and returns config when flag value is 'true'", () => {
      const config = configSchema(
        "Test",
        {
          apiKey: server({ env: "API_KEY", value: "secret-key" }),
        },
        {
          flag: { env: "ENABLE_FEATURE", value: "true" },
        },
      );

      expect(config.isEnabled).toBe(true);
      if (config.isEnabled) {
        expect(config.server.apiKey).toBe("secret-key");
      }
    });

    it("accepts '1' and 'yes' as truthy flag values", () => {
      for (const value of ["1", "yes", "YES", "True", "TRUE"]) {
        const config = configSchema(
          "Test",
          {
            apiKey: server({ env: "API_KEY", value: "test" }),
          },
          {
            flag: { env: "ENABLE_FEATURE", value },
          },
        );

        expect(config.isEnabled).toBe(true);
      }
    });

    it("throws when flag is enabled but value is undefined", () => {
      expect(() =>
        configSchema(
          "Test",
          {
            apiKey: server({ env: "API_KEY", value: undefined }),
          },
          {
            flag: { env: "ENABLE_FEATURE", value: "true" },
          },
        ),
      ).toThrow(InvalidConfigurationError);
    });

    it("skips validation when flag is disabled", () => {
      // Should NOT throw even though apiKey is undefined
      const config = configSchema(
        "Test",
        {
          apiKey: server({ env: "API_KEY", value: undefined }),
        },
        {
          flag: { env: "ENABLE_FEATURE", value: undefined },
        },
      );

      expect(config.isEnabled).toBe(false);
    });
  });

  describe("client-side proxy protection", () => {
    it("allows access to public vars on client", () => {
      // Simulate client environment
      // @ts-expect-error - intentionally manipulating global for tests
      globalThis.window = {};

      const config = configSchema("Test", {
        dsn: pub({ env: "NEXT_PUBLIC_DSN", value: "https://sentry.io/123" }),
      });

      // Should not throw
      expect(config.public.dsn).toBe("https://sentry.io/123");
    });

    it("throws when accessing server var on client", () => {
      // Simulate client environment
      // @ts-expect-error - intentionally manipulating global for tests
      globalThis.window = {};

      const config = configSchema("Test", {
        token: server({ env: "TOKEN", value: "super-secret" }),
      });

      expect(() => config.server.token).toThrow(ServerConfigClientAccessError);
    });

    it("includes key name in client access error", () => {
      // @ts-expect-error - intentionally manipulating global for tests
      globalThis.window = {};

      const config = configSchema("Test", {
        authToken: server({ env: "AUTH_TOKEN", value: "secret" }),
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

      const config = configSchema(
        "Test",
        {
          key: pub({ env: "NEXT_PUBLIC_KEY", value: "public-value" }),
        },
        {
          flag: { env: "ENABLE_FEATURE", value: "true" },
        },
      );

      // Should not throw when accessing isEnabled
      expect(config.isEnabled).toBe(true);
    });

    it("does not use proxy on server (no window)", () => {
      // Ensure window is undefined (server)
      // @ts-expect-error - intentionally manipulating global for tests
      delete globalThis.window;

      const config = configSchema("Test", {
        token: server({ env: "TOKEN", value: "super-secret" }),
      });

      // Should work fine on server
      expect(config.server.token).toBe("super-secret");
    });
  });

  describe("mixed public and server on client", () => {
    it("allows public and blocks server on client", () => {
      // @ts-expect-error - intentionally manipulating global for tests
      globalThis.window = {};

      const config = configSchema("Test", {
        token: server({ env: "TOKEN", value: "secret" }),
        dsn: pub({ env: "NEXT_PUBLIC_DSN", value: "https://sentry.io" }),
      });

      // Public works
      expect(config.public.dsn).toBe("https://sentry.io");

      // Server throws
      expect(() => config.server.token).toThrow(ServerConfigClientAccessError);
    });
  });

  describe("oneOf constraints (either-or values)", () => {
    it("allows value to be undefined when fallback key has value", () => {
      const config = configSchema(
        "Test",
        {
          oidcToken: server({ env: "OIDC_TOKEN", value: undefined }),
          apiKey: server({ env: "API_KEY", value: "api-key-123" }),
        },
        {
          constraints: (s) => [oneOf([s.oidcToken, s.apiKey])],
        },
      );

      expect(config.server.oidcToken).toBeUndefined();
      expect(config.server.apiKey).toBe("api-key-123");
    });

    it("throws when neither value nor fallback has value", () => {
      expect(() =>
        configSchema(
          "Test",
          {
            oidcToken: server({ env: "OIDC_TOKEN", value: undefined }),
            apiKey: server({ env: "API_KEY", value: undefined }),
          },
          {
            constraints: (s) => [oneOf([s.oidcToken, s.apiKey])],
          },
        ),
      ).toThrow(InvalidConfigurationError);
    });

    it("includes both key names in error message", () => {
      try {
        configSchema(
          "Test",
          {
            varA: server({ env: "VAR_A", value: undefined }),
            varB: server({ env: "VAR_B", value: undefined }),
          },
          {
            constraints: (s) => [oneOf([s.varA, s.varB])],
          },
        );
        expect.unreachable("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(InvalidConfigurationError);
        expect((e as Error).message).toContain(
          "Either server.varA (VAR_A) or server.varB (VAR_B) must be defined",
        );
      }
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
