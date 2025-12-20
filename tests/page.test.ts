import { describe, it, expect, beforeAll } from "bun:test";

/**
 * E2E tests for public pages.
 *
 * These tests verify:
 * 1. Homepage (/) returns 200 with expected content and metadata
 * 2. Recipes index (/recipes) redirects to homepage
 *
 * By default, tests run against localhost:3000.
 * Set TEST_BASE_URL environment variable to test against a different server.
 */

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

// Helper to check if we can reach the server
async function canReachServer(): Promise<boolean> {
  try {
    const response = await fetch(BASE_URL, {
      method: "HEAD",
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

describe("Page Tests", () => {
  let serverReachable = false;

  beforeAll(async () => {
    serverReachable = await canReachServer();
    if (!serverReachable) {
      console.warn(
        `\n⚠️  Skipping page tests: Cannot reach ${BASE_URL}\n` +
          `   Start the server with 'bun run dev' first.\n`,
      );
    }
  });

  describe("Homepage (/)", () => {
    it("should return 200", async () => {
      if (!serverReachable) return;

      const response = await fetch(BASE_URL);
      expect(response.status).toBe(200);
    });

    it("should have correct content-type", async () => {
      if (!serverReachable) return;

      const response = await fetch(BASE_URL);
      expect(response.headers.get("content-type")).toContain("text/html");
    });

    it("should contain site title in HTML", async () => {
      if (!serverReachable) return;

      const response = await fetch(BASE_URL);
      const html = await response.text();

      expect(html).toContain("Fullstack Recipes");
    });

    it("should contain meta description", async () => {
      if (!serverReachable) return;

      const response = await fetch(BASE_URL);
      const html = await response.text();

      expect(html).toContain("meta");
      expect(html).toContain("description");
    });

    it("should contain recipes section", async () => {
      if (!serverReachable) return;

      const response = await fetch(BASE_URL);
      const html = await response.text();

      // The page should have links to recipe pages
      expect(html).toContain("/recipes/");
    });
  });

  describe("Recipes index (/recipes)", () => {
    it("should redirect to homepage with anchor", async () => {
      if (!serverReachable) return;

      const response = await fetch(`${BASE_URL}/recipes`, {
        redirect: "manual",
      });

      // Next.js uses 307 for redirects
      expect([301, 302, 307, 308]).toContain(response.status);

      const location = response.headers.get("location");
      expect(location).toBeDefined();
      expect(location).toContain("#recipes");
    });
  });

  describe("Non-existent recipe", () => {
    it("should return 404", async () => {
      if (!serverReachable) return;

      const response = await fetch(
        `${BASE_URL}/recipes/this-recipe-does-not-exist-12345`,
      );
      expect(response.status).toBe(404);
    });
  });
});
