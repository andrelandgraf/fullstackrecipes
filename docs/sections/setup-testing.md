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
  describe("required config (no flag)", () => {
    it("loads string values from env", () => {
      process.env.DATABASE_URL = "postgres://localhost:5432/test";

      const config = loadConfig({
        env: {
          url: "DATABASE_URL",
        },
      });

      expect(config.url).toBe("postgres://localhost:5432/test");
    });

    it("throws when required env var is missing", () => {
      delete process.env.DATABASE_URL;

      expect(() =>
        loadConfig({
          env: {
            url: "DATABASE_URL",
          },
        }),
      ).toThrow(InvalidConfigurationError);
    });

    it("includes env var name in error message", () => {
      delete process.env.MY_SECRET_KEY;

      try {
        loadConfig({
          env: {
            secret: "MY_SECRET_KEY",
          },
        });
        expect.unreachable("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(InvalidConfigurationError);
        expect((e as Error).message).toContain("MY_SECRET_KEY must be defined");
      }
    });

    it("includes feature name in error message when provided", () => {
      delete process.env.API_KEY;

      try {
        loadConfig({
          name: "Stripe",
          env: {
            apiKey: "API_KEY",
          },
        });
        expect.unreachable("Should have thrown");
      } catch (e) {
        expect((e as Error).message).toContain("for Stripe");
      }
    });
  });

  describe("custom schemas", () => {
    it("coerces string to number", () => {
      process.env.PORT = "3000";

      const config = loadConfig({
        env: {
          port: { env: "PORT", schema: z.coerce.number() },
        },
      });

      expect(config.port).toBe(3000);
      expect(typeof config.port).toBe("number");
    });

    it("uses default value when env var is missing", () => {
      delete process.env.POOL_SIZE;

      const config = loadConfig({
        env: {
          poolSize: { env: "POOL_SIZE", schema: z.coerce.number().default(10) },
        },
      });

      expect(config.poolSize).toBe(10);
    });

    it("allows optional values", () => {
      delete process.env.OPTIONAL_VAR;

      const config = loadConfig({
        env: {
          optional: { env: "OPTIONAL_VAR", schema: z.string().optional() },
        },
      });

      expect(config.optional).toBeUndefined();
    });

    it("validates with custom schema and shows error", () => {
      process.env.EMAIL = "invalid-email";

      try {
        loadConfig({
          env: {
            email: {
              env: "EMAIL",
              schema: z.string().email("Must be a valid email"),
            },
          },
        });
        expect.unreachable("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(InvalidConfigurationError);
        expect((e as Error).message).toContain("EMAIL is invalid");
      }
    });
  });

  describe("feature flags", () => {
    it("returns isEnabled: false when flag is not set", () => {
      delete process.env.ENABLE_FEATURE;

      const config = loadConfig({
        flag: "ENABLE_FEATURE",
        env: {
          apiKey: "API_KEY",
        },
      });

      expect(config.isEnabled).toBe(false);
    });

    it("returns isEnabled: false when flag is 'false'", () => {
      process.env.ENABLE_FEATURE = "false";

      const config = loadConfig({
        flag: "ENABLE_FEATURE",
        env: {
          apiKey: "API_KEY",
        },
      });

      expect(config.isEnabled).toBe(false);
    });

    it("validates and returns config when flag is 'true'", () => {
      process.env.ENABLE_FEATURE = "true";
      process.env.API_KEY = "secret-key";

      const config = loadConfig({
        flag: "ENABLE_FEATURE",
        env: {
          apiKey: "API_KEY",
        },
      });

      expect(config.isEnabled).toBe(true);
      if (config.isEnabled) {
        expect(config.apiKey).toBe("secret-key");
      }
    });

    it("accepts '1' and 'yes' as truthy flag values", () => {
      process.env.API_KEY = "test";

      for (const value of ["1", "yes", "YES", "True", "TRUE"]) {
        process.env.ENABLE_FEATURE = value;

        const config = loadConfig({
          flag: "ENABLE_FEATURE",
          env: {
            apiKey: "API_KEY",
          },
        });

        expect(config.isEnabled).toBe(true);
      }
    });

    it("throws when flag is enabled but env var is missing", () => {
      process.env.ENABLE_FEATURE = "true";
      delete process.env.API_KEY;

      expect(() =>
        loadConfig({
          flag: "ENABLE_FEATURE",
          env: {
            apiKey: "API_KEY",
          },
        }),
      ).toThrow(InvalidConfigurationError);
    });

    it("skips validation when flag is disabled (no error for missing vars)", () => {
      delete process.env.ENABLE_FEATURE;
      delete process.env.API_KEY;

      // Should NOT throw even though API_KEY is missing
      const config = loadConfig({
        flag: "ENABLE_FEATURE",
        env: {
          apiKey: "API_KEY",
        },
      });

      expect(config.isEnabled).toBe(false);
    });
  });

  describe("client-side proxy protection", () => {
    it("allows access to NEXT_PUBLIC_ vars on client", () => {
      process.env.NEXT_PUBLIC_DSN = "https://sentry.io/123";
      // Simulate client environment
      // @ts-expect-error - intentionally manipulating global for tests
      globalThis.window = {};

      const config = loadConfig({
        env: {
          dsn: "NEXT_PUBLIC_DSN",
        },
      });

      // Should not throw
      expect(config.dsn).toBe("https://sentry.io/123");
    });

    it("throws when accessing server-only var on client", () => {
      process.env.SECRET_TOKEN = "super-secret";
      // Simulate client environment
      // @ts-expect-error - intentionally manipulating global for tests
      globalThis.window = {};

      const config = loadConfig({
        env: {
          token: "SECRET_TOKEN",
        },
      });

      expect(() => config.token).toThrow(ServerConfigClientAccessError);
    });

    it("includes helpful message in client access error", () => {
      process.env.AUTH_TOKEN = "secret";
      // @ts-expect-error - intentionally manipulating global for tests
      globalThis.window = {};

      const config = loadConfig({
        env: {
          authToken: "AUTH_TOKEN",
        },
      });

      try {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        config.authToken;
        expect.unreachable("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(ServerConfigClientAccessError);
        expect((e as Error).message).toContain("authToken");
        expect((e as Error).message).toContain("AUTH_TOKEN");
        expect((e as Error).message).toContain("NEXT_PUBLIC_");
      }
    });

    it("allows isEnabled access on client", () => {
      process.env.ENABLE_FEATURE = "true";
      process.env.NEXT_PUBLIC_KEY = "public";
      // @ts-expect-error - intentionally manipulating global for tests
      globalThis.window = {};

      const config = loadConfig({
        flag: "ENABLE_FEATURE",
        env: {
          key: "NEXT_PUBLIC_KEY",
        },
      });

      // Should not throw when accessing isEnabled
      expect(config.isEnabled).toBe(true);
    });

    it("does not use proxy on server (no window)", () => {
      process.env.SECRET_TOKEN = "super-secret";
      // Ensure window is undefined (server)
      // @ts-expect-error - intentionally manipulating global for tests
      delete globalThis.window;

      const config = loadConfig({
        env: {
          token: "SECRET_TOKEN",
        },
      });

      // Should work fine on server
      expect(config.token).toBe("super-secret");
    });
  });

  describe("mixed public and private config", () => {
    it("allows public vars and blocks private vars on client", () => {
      process.env.NEXT_PUBLIC_DSN = "https://sentry.io";
      process.env.AUTH_TOKEN = "secret";
      // @ts-expect-error - intentionally manipulating global for tests
      globalThis.window = {};

      const config = loadConfig({
        env: {
          dsn: "NEXT_PUBLIC_DSN",
          token: "AUTH_TOKEN",
        },
      });

      // Public var works
      expect(config.dsn).toBe("https://sentry.io");

      // Private var throws
      expect(() => config.token).toThrow(ServerConfigClientAccessError);
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
