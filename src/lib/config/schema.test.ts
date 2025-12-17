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

    it("includes key path in error message", () => {
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

    it("includes key path in error message", () => {
      try {
        configSchema("Test", {
          analyticsId: pub({
            env: "NEXT_PUBLIC_ANALYTICS_ID",
            value: undefined,
          }),
        });
        expect.unreachable("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(InvalidConfigurationError);
        expect((e as Error).message).toContain(
          "public.analyticsId (NEXT_PUBLIC_ANALYTICS_ID) must be defined",
        );
      }
    });
  });

  describe("mixed server and public", () => {
    it("loads both sections", () => {
      const config = configSchema("Test", {
        token: server({ env: "TOKEN", value: "secret-token" }),
        dsn: pub({ env: "NEXT_PUBLIC_DSN", value: "https://example.com" }),
      });

      expect(config.server.token).toBe("secret-token");
      expect(config.public.dsn).toBe("https://example.com");
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

    it("returns isEnabled: false when flag value is empty string", () => {
      const config = configSchema(
        "Test",
        {
          apiKey: server({ env: "API_KEY", value: "key" }),
        },
        {
          flag: { env: "ENABLE_FEATURE", value: "" },
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

    it("works with flag + constraints", () => {
      const config = configSchema(
        "Test",
        {
          oidcToken: server({ env: "OIDC_TOKEN", value: undefined }),
          apiKey: server({ env: "API_KEY", value: "api-key" }),
        },
        {
          flag: { env: "ENABLE_FEATURE", value: "true" },
          constraints: (s) => [oneOf([s.oidcToken, s.apiKey])],
        },
      );

      expect(config.isEnabled).toBe(true);
      if (config.isEnabled) {
        expect(config.server.oidcToken).toBeUndefined();
        expect(config.server.apiKey).toBe("api-key");
      }
    });

    it("throws when flag is not NEXT_PUBLIC_* but config has public fields", () => {
      expect(() =>
        configSchema(
          "Test",
          {
            token: server({ env: "TOKEN", value: "secret" }),
            dsn: pub({ env: "NEXT_PUBLIC_DSN", value: "https://example.com" }),
          },
          {
            flag: { env: "ENABLE_FEATURE", value: "true" },
          },
        ),
      ).toThrow(InvalidConfigurationError);
    });

    it("includes helpful message when flag is not NEXT_PUBLIC_* with public fields", () => {
      try {
        configSchema(
          "Sentry",
          {
            dsn: pub({ env: "NEXT_PUBLIC_DSN", value: "https://example.com" }),
          },
          {
            flag: { env: "ENABLE_SENTRY", value: "true" },
          },
        );
        expect.unreachable("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(InvalidConfigurationError);
        expect((e as Error).message).toContain("ENABLE_SENTRY");
        expect((e as Error).message).toContain("NEXT_PUBLIC_*");
        expect((e as Error).message).toContain(
          "isEnabled will always be false",
        );
      }
    });

    it("allows non-NEXT_PUBLIC_* flag when config has only server fields", () => {
      const config = configSchema(
        "Test",
        {
          apiKey: server({ env: "API_KEY", value: "secret" }),
        },
        {
          flag: { env: "ENABLE_FEATURE", value: "true" },
        },
      );

      expect(config.isEnabled).toBe(true);
    });

    it("allows NEXT_PUBLIC_* flag when config has public fields", () => {
      const config = configSchema(
        "Test",
        {
          dsn: pub({ env: "NEXT_PUBLIC_DSN", value: "https://example.com" }),
        },
        {
          flag: { env: "NEXT_PUBLIC_ENABLE_FEATURE", value: "true" },
        },
      );

      expect(config.isEnabled).toBe(true);
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

    it("includes schema name, key, and env name in client access error", () => {
      // @ts-expect-error - intentionally manipulating global for tests
      globalThis.window = {};

      const config = configSchema("Auth", {
        authToken: server({ env: "AUTH_TOKEN", value: "secret" }),
      });

      try {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        config.server.authToken;
        expect.unreachable("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(ServerConfigClientAccessError);
        const message = (e as Error).message;
        expect(message).toContain("[Auth]");
        expect(message).toContain("server.authToken");
        expect(message).toContain("AUTH_TOKEN");
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
          flag: { env: "NEXT_PUBLIC_ENABLE_FEATURE", value: "true" },
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

  describe("client-side validation behavior", () => {
    it("skips server validation on client (undefined server vars don't throw)", () => {
      // @ts-expect-error - intentionally manipulating global for tests
      globalThis.window = {};

      // Should NOT throw even though server vars are undefined
      // because on client, server section is not validated
      const config = configSchema("Test", {
        apiKey: server({ env: "API_KEY", value: undefined }),
        secretToken: server({ env: "SECRET_TOKEN", value: undefined }),
        dsn: pub({ env: "NEXT_PUBLIC_DSN", value: "https://sentry.io" }),
      });

      // Public still works
      expect(config.public.dsn).toBe("https://sentry.io");

      // Server access throws (proxy protection)
      expect(() => config.server.apiKey).toThrow(ServerConfigClientAccessError);
    });

    it("still validates public section on client", () => {
      // @ts-expect-error - intentionally manipulating global for tests
      globalThis.window = {};

      // Should throw because public vars are undefined on client
      expect(() =>
        configSchema("Test", {
          apiKey: server({ env: "API_KEY", value: undefined }), // Should not cause error on client
          dsn: pub({ env: "NEXT_PUBLIC_DSN", value: undefined }), // Should cause error
        }),
      ).toThrow(InvalidConfigurationError);
    });

    it("public validation error message is correct on client", () => {
      // @ts-expect-error - intentionally manipulating global for tests
      globalThis.window = {};

      try {
        configSchema("Test", {
          apiKey: server({ env: "API_KEY", value: undefined }),
          analyticsId: pub({
            env: "NEXT_PUBLIC_ANALYTICS_ID",
            value: undefined,
          }),
        });
        expect.unreachable("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(InvalidConfigurationError);
        expect((e as Error).message).toContain(
          "public.analyticsId (NEXT_PUBLIC_ANALYTICS_ID) must be defined",
        );
      }
    });

    it("skips server schema validation on client", () => {
      // @ts-expect-error - intentionally manipulating global for tests
      globalThis.window = {};

      // Invalid schema value for server should not throw on client
      const config = configSchema("Test", {
        port: server({
          env: "PORT",
          value: "not-a-number",
          schema: z.coerce.number(),
        }),
        key: pub({ env: "NEXT_PUBLIC_KEY", value: "value" }),
      });

      expect(config.public.key).toBe("value");
      expect(() => config.server.port).toThrow(ServerConfigClientAccessError);
    });

    it("still validates public schema on client", () => {
      // @ts-expect-error - intentionally manipulating global for tests
      globalThis.window = {};

      // Invalid schema value for public should throw on client
      expect(() =>
        configSchema("Test", {
          apiKey: server({ env: "API_KEY", value: undefined }),
          email: pub({
            env: "NEXT_PUBLIC_EMAIL",
            value: "invalid-email",
            schema: z.string().email(),
          }),
        }),
      ).toThrow(InvalidConfigurationError);
    });

    it("works with feature flag on client", () => {
      // @ts-expect-error - intentionally manipulating global for tests
      globalThis.window = {};

      const config = configSchema(
        "Test",
        {
          apiKey: server({ env: "API_KEY", value: undefined }), // Would throw on server, not on client
          dsn: pub({ env: "NEXT_PUBLIC_DSN", value: "https://sentry.io" }),
        },
        {
          flag: { env: "NEXT_PUBLIC_ENABLE_FEATURE", value: "true" },
        },
      );

      expect(config.isEnabled).toBe(true);
      if (config.isEnabled) {
        expect(config.public.dsn).toBe("https://sentry.io");
        expect(() => config.server.apiKey).toThrow(
          ServerConfigClientAccessError,
        );
      }
    });

    it("skips conditional optional validation for server on client", () => {
      // @ts-expect-error - intentionally manipulating global for tests
      globalThis.window = {};

      // Both undefined would throw on server, but not on client
      const config = configSchema(
        "Test",
        {
          oidcToken: server({ env: "OIDC_TOKEN", value: undefined }),
          apiKey: server({ env: "API_KEY", value: undefined }),
          dsn: pub({ env: "NEXT_PUBLIC_DSN", value: "https://sentry.io" }),
        },
        {
          constraints: (s) => [oneOf([s.oidcToken, s.apiKey])],
        },
      );

      expect(config.public.dsn).toBe("https://sentry.io");
      expect(() => config.server.oidcToken).toThrow(
        ServerConfigClientAccessError,
      );
    });

    it("validates on server (control test)", () => {
      // Ensure window is undefined (server)
      // @ts-expect-error - intentionally manipulating global for tests
      delete globalThis.window;

      // Should throw on server because apiKey is undefined
      expect(() =>
        configSchema("Test", {
          apiKey: server({ env: "API_KEY", value: undefined }),
        }),
      ).toThrow(InvalidConfigurationError);
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

      // No isEnabled property (no flag)
      expect("isEnabled" in config).toBe(false);
      expect(config.server.oidcToken).toBeUndefined();
      expect(config.server.apiKey).toBe("api-key-123");
    });

    it("allows value to be undefined when any fallback key has value (array)", () => {
      const config = configSchema(
        "Test",
        {
          primary: server({ env: "PRIMARY", value: undefined }),
          secondary: server({
            env: "SECONDARY",
            value: undefined,
            optional: true,
          }),
          tertiary: server({ env: "TERTIARY", value: "tertiary-value" }),
        },
        {
          constraints: (s) => [oneOf([s.primary, s.secondary, s.tertiary])],
        },
      );

      // No isEnabled property (no flag)
      expect("isEnabled" in config).toBe(false);
      expect(config.server.primary).toBeUndefined();
      expect(config.server.tertiary).toBe("tertiary-value");
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

    it("includes all fallback keys in error message (array)", () => {
      try {
        configSchema(
          "Test",
          {
            varA: server({ env: "VAR_A", value: undefined }),
            varB: server({ env: "VAR_B", value: undefined, optional: true }),
            varC: server({ env: "VAR_C", value: undefined, optional: true }),
          },
          {
            constraints: (s) => [oneOf([s.varA, s.varB, s.varC])],
          },
        );
        expect.unreachable("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(InvalidConfigurationError);
        expect((e as Error).message).toContain(
          "Either server.varA (VAR_A) or one of [server.varB (VAR_B), server.varC (VAR_C)] must be defined",
        );
      }
    });

    it("works with both values set", () => {
      const config = configSchema(
        "Test",
        {
          oidcToken: server({ env: "OIDC_TOKEN", value: "oidc-token" }),
          apiKey: server({ env: "API_KEY", value: "api-key" }),
        },
        {
          constraints: (s) => [oneOf([s.oidcToken, s.apiKey])],
        },
      );

      // No isEnabled property (no flag)
      expect("isEnabled" in config).toBe(false);
      expect(config.server.oidcToken).toBe("oidc-token");
      expect(config.server.apiKey).toBe("api-key");
    });

    it("works with feature flag and constraints", () => {
      const config = configSchema(
        "Test",
        {
          oidcToken: server({ env: "OIDC_TOKEN", value: undefined }),
          apiKey: server({ env: "API_KEY", value: "api-key" }),
        },
        {
          flag: { env: "ENABLE_FEATURE", value: "true" },
          constraints: (s) => [oneOf([s.oidcToken, s.apiKey])],
        },
      );

      expect(config.isEnabled).toBe(true);
      if (config.isEnabled) {
        expect(config.server.oidcToken).toBeUndefined();
        expect(config.server.apiKey).toBe("api-key");
      }
    });

    it("skips validation when feature flag is disabled", () => {
      const config = configSchema(
        "Test",
        {
          oidcToken: server({ env: "OIDC_TOKEN", value: undefined }),
          apiKey: server({ env: "API_KEY", value: undefined }),
        },
        {
          flag: { env: "ENABLE_FEATURE", value: undefined },
          constraints: (s) => [oneOf([s.oidcToken, s.apiKey])],
        },
      );

      expect(config.isEnabled).toBe(false);
    });

    it("treats empty string as not having a value", () => {
      expect(() =>
        configSchema(
          "Test",
          {
            varA: server({ env: "VAR_A", value: undefined }),
            varB: server({ env: "VAR_B", value: "" }),
          },
          {
            constraints: (s) => [oneOf([s.varA, s.varB])],
          },
        ),
      ).toThrow(InvalidConfigurationError);
    });

    it("works with optional: true (always optional)", () => {
      const config = configSchema("Test", {
        optionalVar: server({
          env: "OPTIONAL_VAR",
          value: undefined,
          optional: true,
        }),
      });

      expect(config.server.optionalVar).toBeUndefined();
    });

    it("works with optional: false (required)", () => {
      expect(() =>
        configSchema("Test", {
          requiredVar: server({
            env: "REQUIRED_VAR",
            value: undefined,
            optional: false,
          }),
        }),
      ).toThrow(InvalidConfigurationError);
    });
  });

  describe("real-world usage patterns", () => {
    it("works like the Sentry config example", () => {
      const config = configSchema(
        "Sentry",
        {
          token: server({
            env: "SENTRY_AUTH_TOKEN",
            value: "sentry-auth-token",
          }),
          dsn: pub({
            env: "NEXT_PUBLIC_SENTRY_DSN",
            value: "https://abc@sentry.io/123",
          }),
          project: pub({
            env: "NEXT_PUBLIC_SENTRY_PROJECT",
            value: "my-project",
          }),
          org: pub({ env: "NEXT_PUBLIC_SENTRY_ORG", value: "my-org" }),
        },
        {
          flag: { env: "NEXT_PUBLIC_ENABLE_SENTRY", value: "true" },
        },
      );

      expect(config.isEnabled).toBe(true);
      if (config.isEnabled) {
        expect(config.server.token).toBe("sentry-auth-token");
        expect(config.public.dsn).toBe("https://abc@sentry.io/123");
        expect(config.public.project).toBe("my-project");
        expect(config.public.org).toBe("my-org");
      }
    });

    it("works with server-only config (no public)", () => {
      const config = configSchema("Database", {
        url: server({ env: "DATABASE_URL", value: "postgres://localhost" }),
      });

      expect(config.server.url).toBe("postgres://localhost");
    });

    it("works with public-only config (no server)", () => {
      const config = configSchema("Analytics", {
        analyticsId: pub({
          env: "NEXT_PUBLIC_ANALYTICS_ID",
          value: "UA-123456",
        }),
      });

      expect(config.public.analyticsId).toBe("UA-123456");
    });

    it("works with oneOf constraint (no flag, no isEnabled)", () => {
      const config = configSchema(
        "AI",
        {
          oidcToken: server({ env: "VERCEL_OIDC_TOKEN", value: undefined }),
          gatewayApiKey: server({
            env: "AI_GATEWAY_API_KEY",
            value: "gateway-key",
          }),
        },
        {
          constraints: (s) => [oneOf([s.oidcToken, s.gatewayApiKey])],
        },
      );

      // Type check: config should NOT have isEnabled
      expect("isEnabled" in config).toBe(false);

      // Access properties directly
      expect(config.server.oidcToken).toBeUndefined();
      expect(config.server.gatewayApiKey).toBe("gateway-key");
    });
  });
});
