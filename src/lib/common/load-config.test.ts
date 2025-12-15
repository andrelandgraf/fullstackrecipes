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

    it("includes key path in error message", () => {
      try {
        loadConfig({
          public: {
            analyticsId: undefined,
          },
        });
        expect.unreachable("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(InvalidConfigurationError);
        expect((e as Error).message).toContain(
          "public.analyticsId must be defined",
        );
      }
    });
  });

  describe("mixed server and public", () => {
    it("loads both sections", () => {
      const config = loadConfig({
        server: {
          token: "secret-token",
        },
        public: {
          dsn: "https://example.com",
        },
      });

      expect(config.server.token).toBe("secret-token");
      expect(config.public.dsn).toBe("https://example.com");
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

    it("returns isEnabled: false when flag is empty string", () => {
      const config = loadConfig({
        flag: "",
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

  describe("client-side validation behavior", () => {
    it("skips server validation on client (undefined server vars don't throw)", () => {
      // @ts-expect-error - intentionally manipulating global for tests
      globalThis.window = {};

      // Should NOT throw even though server vars are undefined
      // because on client, server section is not validated
      const config = loadConfig({
        server: {
          apiKey: undefined,
          secretToken: undefined,
        },
        public: {
          dsn: "https://sentry.io",
        },
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
        loadConfig({
          server: {
            apiKey: undefined, // Should not cause error on client
          },
          public: {
            dsn: undefined, // Should cause error
          },
        }),
      ).toThrow(InvalidConfigurationError);
    });

    it("public validation error message is correct on client", () => {
      // @ts-expect-error - intentionally manipulating global for tests
      globalThis.window = {};

      try {
        loadConfig({
          server: {
            apiKey: undefined,
          },
          public: {
            analyticsId: undefined,
          },
        });
        expect.unreachable("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(InvalidConfigurationError);
        expect((e as Error).message).toContain(
          "public.analyticsId must be defined",
        );
      }
    });

    it("skips server schema validation on client", () => {
      // @ts-expect-error - intentionally manipulating global for tests
      globalThis.window = {};

      // Invalid schema value for server should not throw on client
      const config = loadConfig({
        server: {
          port: { value: "not-a-number", schema: z.coerce.number() },
        },
        public: {
          key: "value",
        },
      });

      expect(config.public.key).toBe("value");
      expect(() => config.server.port).toThrow(ServerConfigClientAccessError);
    });

    it("still validates public schema on client", () => {
      // @ts-expect-error - intentionally manipulating global for tests
      globalThis.window = {};

      // Invalid schema value for public should throw on client
      expect(() =>
        loadConfig({
          server: {
            apiKey: undefined,
          },
          public: {
            email: {
              value: "invalid-email",
              schema: z.string().email(),
            },
          },
        }),
      ).toThrow(InvalidConfigurationError);
    });

    it("works with feature flag on client", () => {
      // @ts-expect-error - intentionally manipulating global for tests
      globalThis.window = {};

      const config = loadConfig({
        flag: "true",
        server: {
          apiKey: undefined, // Would throw on server, not on client
        },
        public: {
          dsn: "https://sentry.io",
        },
      });

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
      const config = loadConfig({
        server: {
          oidcToken: { value: undefined, optional: "apiKey" },
          apiKey: { value: undefined, optional: "oidcToken" },
        },
        public: {
          dsn: "https://sentry.io",
        },
      });

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
        loadConfig({
          server: {
            apiKey: undefined,
          },
        }),
      ).toThrow(InvalidConfigurationError);
    });
  });

  describe("conditional optional (either-or values)", () => {
    it("allows value to be undefined when fallback key has value", () => {
      const config = loadConfig({
        server: {
          oidcToken: { value: undefined, optional: "apiKey" },
          apiKey: { value: "api-key-123", optional: "oidcToken" },
        },
      });

      expect(config.server.oidcToken).toBeUndefined();
      expect(config.server.apiKey).toBe("api-key-123");
    });

    it("allows value to be undefined when any fallback key has value (array)", () => {
      const config = loadConfig({
        server: {
          primary: { value: undefined, optional: ["secondary", "tertiary"] },
          secondary: { value: undefined, optional: true },
          tertiary: { value: "tertiary-value" },
        },
      });

      expect(config.server.primary).toBeUndefined();
      expect(config.server.tertiary).toBe("tertiary-value");
    });

    it("throws when neither value nor fallback has value", () => {
      expect(() =>
        loadConfig({
          server: {
            oidcToken: { value: undefined, optional: "apiKey" },
            apiKey: { value: undefined, optional: "oidcToken" },
          },
        }),
      ).toThrow(InvalidConfigurationError);
    });

    it("includes both key names in error message", () => {
      try {
        loadConfig({
          server: {
            varA: { value: undefined, optional: "varB" },
            varB: { value: undefined, optional: "varA" },
          },
        });
        expect.unreachable("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(InvalidConfigurationError);
        expect((e as Error).message).toContain(
          "Either server.varA or server.varB must be defined",
        );
      }
    });

    it("includes all fallback keys in error message (array)", () => {
      try {
        loadConfig({
          server: {
            varA: { value: undefined, optional: ["varB", "varC"] },
            varB: { value: undefined, optional: true },
            varC: { value: undefined, optional: true },
          },
        });
        expect.unreachable("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(InvalidConfigurationError);
        expect((e as Error).message).toContain(
          "Either server.varA or one of [server.varB, server.varC] must be defined",
        );
      }
    });

    it("works with both values set", () => {
      const config = loadConfig({
        server: {
          oidcToken: { value: "oidc-token", optional: "apiKey" },
          apiKey: { value: "api-key", optional: "oidcToken" },
        },
      });

      expect(config.server.oidcToken).toBe("oidc-token");
      expect(config.server.apiKey).toBe("api-key");
    });

    it("works with feature flag", () => {
      const config = loadConfig({
        flag: "true",
        server: {
          oidcToken: { value: undefined, optional: "apiKey" },
          apiKey: { value: "api-key", optional: "oidcToken" },
        },
      });

      expect(config.isEnabled).toBe(true);
      if (config.isEnabled) {
        expect(config.server.oidcToken).toBeUndefined();
        expect(config.server.apiKey).toBe("api-key");
      }
    });

    it("skips validation when feature flag is disabled", () => {
      const config = loadConfig({
        flag: undefined,
        server: {
          oidcToken: { value: undefined, optional: "apiKey" },
          apiKey: { value: undefined, optional: "oidcToken" },
        },
      });

      expect(config.isEnabled).toBe(false);
    });

    it("treats empty string as not having a value", () => {
      expect(() =>
        loadConfig({
          server: {
            varA: { value: undefined, optional: "varB" },
            varB: { value: "" },
          },
        }),
      ).toThrow(InvalidConfigurationError);
    });

    it("works with optional: true (always optional)", () => {
      const config = loadConfig({
        server: {
          optionalVar: { value: undefined, optional: true },
        },
      });

      expect(config.server.optionalVar).toBeUndefined();
    });

    it("works with optional: false (required)", () => {
      expect(() =>
        loadConfig({
          server: {
            requiredVar: { value: undefined, optional: false },
          },
        }),
      ).toThrow(InvalidConfigurationError);
    });
  });

  describe("real-world usage patterns", () => {
    it("works like the Sentry config example", () => {
      const config = loadConfig({
        name: "Sentry",
        flag: "true",
        server: {
          token: "sentry-auth-token",
        },
        public: {
          dsn: "https://abc@sentry.io/123",
          project: "my-project",
          org: "my-org",
        },
      });

      expect(config.isEnabled).toBe(true);
      if (config.isEnabled) {
        expect(config.server.token).toBe("sentry-auth-token");
        expect(config.public.dsn).toBe("https://abc@sentry.io/123");
        expect(config.public.project).toBe("my-project");
        expect(config.public.org).toBe("my-org");
      }
    });

    it("works with server-only config (no public)", () => {
      const config = loadConfig({
        server: {
          url: "postgres://localhost",
        },
      });

      expect(config.server.url).toBe("postgres://localhost");
    });

    it("works with public-only config (no server)", () => {
      const config = loadConfig({
        public: {
          analyticsId: "UA-123456",
        },
      });

      expect(config.public.analyticsId).toBe("UA-123456");
    });
  });
});
