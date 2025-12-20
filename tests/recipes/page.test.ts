import { describe, it, expect, beforeAll } from "bun:test";
import { getAllItems, recipeRedirects } from "@/lib/recipes/data";

/**
 * E2E tests for recipe pages.
 *
 * These tests verify all recipe pages (/recipes/[slug]) return 200 with expected content.
 *
 * By default, tests run against localhost:3000.
 * Set TEST_BASE_URL environment variable to test against a different server.
 */

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

// Helper to escape special HTML characters for matching in HTML content
function escapeHtmlForMatch(text: string): string {
  return text.replace(/&/g, "&amp;");
}

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

describe("Recipe Page Tests", () => {
  let serverReachable = false;

  beforeAll(async () => {
    serverReachable = await canReachServer();
    if (!serverReachable) {
      console.warn(
        `\n⚠️  Skipping recipe page tests: Cannot reach ${BASE_URL}\n` +
          `   Start the server with 'bun run dev' first.\n`,
      );
    }
  });

  describe("Recipe pages (/recipes/[slug])", () => {
    const allItems = getAllItems();

    it("should have recipes to test", () => {
      expect(allItems.length).toBeGreaterThan(0);
    });

    for (const item of allItems) {
      describe(`/recipes/${item.slug}`, () => {
        it("should return 200", async () => {
          if (!serverReachable) return;

          const response = await fetch(`${BASE_URL}/recipes/${item.slug}`);
          expect(response.status).toBe(200);
        });

        it("should have correct content-type", async () => {
          if (!serverReachable) return;

          const response = await fetch(`${BASE_URL}/recipes/${item.slug}`);
          expect(response.headers.get("content-type")).toContain("text/html");
        });

        it("should contain recipe title", async () => {
          if (!serverReachable) return;

          const response = await fetch(`${BASE_URL}/recipes/${item.slug}`);
          const html = await response.text();

          // Titles with & get HTML-encoded to &amp; in the page
          expect(html).toContain(escapeHtmlForMatch(item.title));
        });

        it("should contain recipe description", async () => {
          if (!serverReachable) return;

          const response = await fetch(`${BASE_URL}/recipes/${item.slug}`);
          const html = await response.text();

          // Description should appear in meta tag or page content
          // Some descriptions may be truncated, so check for first 50 chars
          const shortDescription = item.description.substring(0, 50);
          expect(html).toContain(shortDescription);
        });

        it("should contain recipe tags", async () => {
          if (!serverReachable) return;

          const response = await fetch(`${BASE_URL}/recipes/${item.slug}`);
          const html = await response.text();

          // At least one tag should appear on the page
          const hasAtLeastOneTag = item.tags.some((tag) => html.includes(tag));
          expect(hasAtLeastOneTag).toBe(true);
        });
      });
    }
  });

  describe("Redirects for old recipe slugs", () => {
    for (const [oldSlug, newSlug] of Object.entries(recipeRedirects)) {
      it(`/recipes/${oldSlug} should redirect to /recipes/${newSlug}`, async () => {
        if (!serverReachable) return;

        // Fetch without following redirects to verify redirect behavior
        const response = await fetch(`${BASE_URL}/recipes/${oldSlug}`, {
          redirect: "manual",
        });

        // Should be a redirect (307 for Next.js temporary redirect from redirect())
        expect([301, 302, 307, 308]).toContain(response.status);
        const location = response.headers.get("location");
        expect(location).toContain(`/recipes/${newSlug}`);
      });

      it(`/recipes/${oldSlug} should return 200 when following redirects`, async () => {
        if (!serverReachable) return;

        // Follow redirects and verify we get a valid page
        const response = await fetch(`${BASE_URL}/recipes/${oldSlug}`);
        expect(response.status).toBe(200);
      });
    }
  });
});
