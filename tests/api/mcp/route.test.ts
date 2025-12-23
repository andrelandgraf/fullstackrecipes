import { describe, it, expect, beforeAll } from "bun:test";

/**
 * Smoke tests for the MCP endpoints.
 *
 * These tests verify:
 * 1. Both /api/mcp and /api/openai-mcp respond correctly
 * 2. MCP protocol initialization works
 * 3. Resources and prompts are listed on both endpoints
 * 4. OpenAI-specific tools and widget are only on /api/openai-mcp
 *
 * Requires a running dev server (bun run dev).
 */

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

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

function mcpRequest(
  endpoint: string,
  method: string,
  params: Record<string, unknown> = {},
) {
  return fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
  });
}

async function initializeAndCall(
  endpoint: string,
  method: string,
  params: Record<string, unknown> = {},
) {
  // First initialize the session
  await mcpRequest(endpoint, "initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "test", version: "1.0" },
  });

  // Then make the actual call
  return mcpRequest(endpoint, method, params);
}

describe("MCP Server Tests", () => {
  let serverReachable = false;

  beforeAll(async () => {
    serverReachable = await canReachServer();
    if (!serverReachable) {
      console.warn(
        `\n⚠️  Skipping MCP tests: Cannot reach ${BASE_URL}\n` +
          `   Start the server with 'bun run dev' first.\n`,
      );
    }
  });

  describe("/api/mcp (base MCP server)", () => {
    const endpoint = "/api/mcp";

    it("should respond to OPTIONS with CORS headers", async () => {
      if (!serverReachable) return;

      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: "OPTIONS",
      });

      expect(response.status).toBe(204);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
      expect(response.headers.get("Access-Control-Allow-Methods")).toContain(
        "POST",
      );
    });

    it("should initialize MCP session", async () => {
      if (!serverReachable) return;

      const response = await mcpRequest(endpoint, "initialize", {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0" },
      });

      expect(response.ok).toBe(true);
      const json = await response.json();
      expect(json.result).toBeDefined();
      expect(json.result.serverInfo).toBeDefined();
    });

    it("should list resources", async () => {
      if (!serverReachable) return;

      const response = await initializeAndCall(endpoint, "resources/list");

      expect(response.ok).toBe(true);
      const json = await response.json();
      expect(json.result?.resources).toBeDefined();
      expect(Array.isArray(json.result.resources)).toBe(true);
      expect(json.result.resources.length).toBeGreaterThan(0);

      // Should have recipe resources
      const hasRecipe = json.result.resources.some(
        (r: { uri: string }) =>
          r.uri.startsWith("recipe://") || r.uri.startsWith("cookbook://"),
      );
      expect(hasRecipe).toBe(true);
    });

    it("should list prompts", async () => {
      if (!serverReachable) return;

      const response = await initializeAndCall(endpoint, "prompts/list");

      expect(response.ok).toBe(true);
      const json = await response.json();
      expect(json.result?.prompts).toBeDefined();
      expect(Array.isArray(json.result.prompts)).toBe(true);
      expect(json.result.prompts.length).toBeGreaterThan(0);

      // Should have implement-* prompts
      const hasImplementPrompt = json.result.prompts.some(
        (p: { name: string }) => p.name.startsWith("implement-"),
      );
      expect(hasImplementPrompt).toBe(true);
    });

    it("should NOT have tools (base server)", async () => {
      if (!serverReachable) return;

      const response = await initializeAndCall(endpoint, "tools/list");

      expect(response.ok).toBe(true);
      const json = await response.json();
      // Base server should have no tools or empty tools
      const tools = json.result?.tools ?? [];
      expect(tools.length).toBe(0);
    });

    it("should NOT have the widget resource (base server)", async () => {
      if (!serverReachable) return;

      const response = await initializeAndCall(endpoint, "resources/list");

      expect(response.ok).toBe(true);
      const json = await response.json();
      const hasWidget = json.result.resources.some(
        (r: { uri: string }) => r.uri === "ui://widget/fullstackrecipes.html",
      );
      expect(hasWidget).toBe(false);
    });
  });

  describe("/api/openai-mcp (OpenAI Apps enhanced server)", () => {
    const endpoint = "/api/openai-mcp";

    it("should respond to OPTIONS with CORS headers", async () => {
      if (!serverReachable) return;

      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: "OPTIONS",
      });

      expect(response.status).toBe(204);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
      expect(response.headers.get("Access-Control-Allow-Headers")).toContain(
        "mcp-session-id",
      );
      expect(response.headers.get("Access-Control-Expose-Headers")).toContain(
        "Mcp-Session-Id",
      );
    });

    it("should initialize MCP session", async () => {
      if (!serverReachable) return;

      const response = await mcpRequest(endpoint, "initialize", {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0" },
      });

      expect(response.ok).toBe(true);
      const json = await response.json();
      expect(json.result).toBeDefined();
      expect(json.result.serverInfo).toBeDefined();
    });

    it("should list resources including widget", async () => {
      if (!serverReachable) return;

      const response = await initializeAndCall(endpoint, "resources/list");

      expect(response.ok).toBe(true);
      const json = await response.json();
      expect(json.result?.resources).toBeDefined();

      // Should have the widget resource
      const hasWidget = json.result.resources.some(
        (r: { uri: string }) => r.uri === "ui://widget/fullstackrecipes.html",
      );
      expect(hasWidget).toBe(true);

      // Should also have recipe resources
      const hasRecipe = json.result.resources.some(
        (r: { uri: string }) =>
          r.uri.startsWith("recipe://") || r.uri.startsWith("cookbook://"),
      );
      expect(hasRecipe).toBe(true);
    });

    it("should list tools (list_items, select_item)", async () => {
      if (!serverReachable) return;

      const response = await initializeAndCall(endpoint, "tools/list");

      expect(response.ok).toBe(true);
      const json = await response.json();
      expect(json.result?.tools).toBeDefined();
      expect(Array.isArray(json.result.tools)).toBe(true);

      const toolNames = json.result.tools.map((t: { name: string }) => t.name);
      expect(toolNames).toContain("list_items");
      expect(toolNames).toContain("select_item");
    });

    it("should execute list_items tool", async () => {
      if (!serverReachable) return;

      const response = await initializeAndCall(endpoint, "tools/call", {
        name: "list_items",
        arguments: {},
      });

      expect(response.ok).toBe(true);
      const json = await response.json();
      expect(json.result).toBeDefined();

      // Should return structured content with items
      const content = json.result.content ?? [];
      const structuredContent = json.result.structuredContent;

      // Either content or structuredContent should have items
      const hasItems =
        structuredContent?.items?.length > 0 ||
        content.some(
          (c: { type: string; text: string }) =>
            c.type === "text" && c.text.includes("items"),
        );
      expect(hasItems || structuredContent?.items).toBeTruthy();
    });

    it("should execute select_item tool", async () => {
      if (!serverReachable) return;

      const response = await initializeAndCall(endpoint, "tools/call", {
        name: "select_item",
        arguments: { slug: "neon-drizzle-setup" },
      });

      expect(response.ok).toBe(true);
      const json = await response.json();
      expect(json.result).toBeDefined();

      // Should return structured content with selected item
      const structuredContent = json.result.structuredContent;
      expect(structuredContent?.selected).toBeDefined();
      expect(structuredContent?.selected?.slug).toBe("neon-drizzle-setup");
      expect(structuredContent?.selected?.resourceUri).toContain("recipe://");
    });

    it("should return error for non-existent item", async () => {
      if (!serverReachable) return;

      const response = await initializeAndCall(endpoint, "tools/call", {
        name: "select_item",
        arguments: { slug: "non-existent-recipe-12345" },
      });

      expect(response.ok).toBe(true);
      const json = await response.json();

      const structuredContent = json.result.structuredContent;
      expect(structuredContent?.error).toBeDefined();
    });
  });
});
