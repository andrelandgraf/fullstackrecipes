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

  describe("conditional optional (either-or env vars)", () => {
    it("allows var to be missing when fallback is set (string)", () => {
      delete process.env.VERCEL_OIDC_TOKEN;
      process.env.AI_GATEWAY_API_KEY = "api-key-123";

      const config = loadConfig({
        env: {
          oidcToken: {
            env: "VERCEL_OIDC_TOKEN",
            optional: "AI_GATEWAY_API_KEY",
          },
          apiKey: { env: "AI_GATEWAY_API_KEY", optional: "VERCEL_OIDC_TOKEN" },
        },
      });

      expect(config.oidcToken).toBeUndefined();
      expect(config.apiKey).toBe("api-key-123");
    });

    it("allows var to be missing when fallback is set (array)", () => {
      delete process.env.PRIMARY_TOKEN;
      delete process.env.SECONDARY_TOKEN;
      process.env.TERTIARY_TOKEN = "tertiary-value";

      const config = loadConfig({
        env: {
          primary: {
            env: "PRIMARY_TOKEN",
            optional: ["SECONDARY_TOKEN", "TERTIARY_TOKEN"],
          },
          tertiary: { env: "TERTIARY_TOKEN" },
        },
      });

      expect(config.primary).toBeUndefined();
      expect(config.tertiary).toBe("tertiary-value");
    });

    it("throws when neither var nor fallback is set", () => {
      delete process.env.VERCEL_OIDC_TOKEN;
      delete process.env.AI_GATEWAY_API_KEY;

      expect(() =>
        loadConfig({
          env: {
            oidcToken: {
              env: "VERCEL_OIDC_TOKEN",
              optional: "AI_GATEWAY_API_KEY",
            },
            apiKey: {
              env: "AI_GATEWAY_API_KEY",
              optional: "VERCEL_OIDC_TOKEN",
            },
          },
        }),
      ).toThrow(InvalidConfigurationError);
    });

    it("includes both var names in error message for either-or", () => {
      delete process.env.VAR_A;
      delete process.env.VAR_B;

      try {
        loadConfig({
          env: {
            varA: { env: "VAR_A", optional: "VAR_B" },
          },
        });
        expect.unreachable("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(InvalidConfigurationError);
        expect((e as Error).message).toContain(
          "Either VAR_A or VAR_B must be defined",
        );
      }
    });

    it("includes all fallback var names in error message for array", () => {
      delete process.env.VAR_A;
      delete process.env.VAR_B;
      delete process.env.VAR_C;

      try {
        loadConfig({
          env: {
            varA: { env: "VAR_A", optional: ["VAR_B", "VAR_C"] },
          },
        });
        expect.unreachable("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(InvalidConfigurationError);
        expect((e as Error).message).toContain(
          "Either VAR_A or one of [VAR_B, VAR_C] must be defined",
        );
      }
    });

    it("works with both vars set", () => {
      process.env.VERCEL_OIDC_TOKEN = "oidc-token";
      process.env.AI_GATEWAY_API_KEY = "api-key";

      const config = loadConfig({
        env: {
          oidcToken: {
            env: "VERCEL_OIDC_TOKEN",
            optional: "AI_GATEWAY_API_KEY",
          },
          apiKey: { env: "AI_GATEWAY_API_KEY", optional: "VERCEL_OIDC_TOKEN" },
        },
      });

      expect(config.oidcToken).toBe("oidc-token");
      expect(config.apiKey).toBe("api-key");
    });

    it("works with feature flag", () => {
      process.env.ENABLE_AI = "true";
      delete process.env.VERCEL_OIDC_TOKEN;
      process.env.AI_GATEWAY_API_KEY = "api-key";

      const config = loadConfig({
        flag: "ENABLE_AI",
        env: {
          oidcToken: {
            env: "VERCEL_OIDC_TOKEN",
            optional: "AI_GATEWAY_API_KEY",
          },
          apiKey: { env: "AI_GATEWAY_API_KEY", optional: "VERCEL_OIDC_TOKEN" },
        },
      });

      expect(config.isEnabled).toBe(true);
      if (config.isEnabled) {
        expect(config.oidcToken).toBeUndefined();
        expect(config.apiKey).toBe("api-key");
      }
    });

    it("skips validation when feature flag is disabled", () => {
      delete process.env.ENABLE_AI;
      delete process.env.VERCEL_OIDC_TOKEN;
      delete process.env.AI_GATEWAY_API_KEY;

      const config = loadConfig({
        flag: "ENABLE_AI",
        env: {
          oidcToken: {
            env: "VERCEL_OIDC_TOKEN",
            optional: "AI_GATEWAY_API_KEY",
          },
          apiKey: { env: "AI_GATEWAY_API_KEY", optional: "VERCEL_OIDC_TOKEN" },
        },
      });

      expect(config.isEnabled).toBe(false);
    });

    it("treats empty string as not set for fallback check", () => {
      delete process.env.VAR_A;
      process.env.VAR_B = "";

      expect(() =>
        loadConfig({
          env: {
            varA: { env: "VAR_A", optional: "VAR_B" },
          },
        }),
      ).toThrow(InvalidConfigurationError);
    });

    it("works with optional: true (always optional)", () => {
      delete process.env.OPTIONAL_VAR;

      const config = loadConfig({
        env: {
          optionalVar: { env: "OPTIONAL_VAR", optional: true },
        },
      });

      expect(config.optionalVar).toBeUndefined();
    });

    it("works with optional: false (required)", () => {
      delete process.env.REQUIRED_VAR;

      expect(() =>
        loadConfig({
          env: {
            requiredVar: { env: "REQUIRED_VAR", optional: false },
          },
        }),
      ).toThrow(InvalidConfigurationError);
    });
  });
});
