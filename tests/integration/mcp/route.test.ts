import { describe, it, expect, beforeAll } from "bun:test";

/**
 * Smoke tests for the MCP endpoints.
 *
 * These tests verify:
 * 1. Both /api/mcp and /api/openai/mcp respond to HTTP methods
 * 2. CORS headers are set correctly
 * 3. MCP protocol initialization works
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
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
  });
}

async function mcpRequestJson(
  endpoint: string,
  method: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const response = await mcpRequest(endpoint, method, params);
  const text = await response.text();

  // Handle SSE format: "event: message\ndata: {...}\n\n"
  if (text.startsWith("event:")) {
    const dataLine = text.split("\n").find((line) => line.startsWith("data:"));
    if (dataLine) {
      return JSON.parse(dataLine.slice(5).trim());
    }
  }

  // Handle plain JSON
  return JSON.parse(text);
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

    it("should respond to GET request", async () => {
      if (!serverReachable) return;

      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: "GET",
      });

      // MCP is POST-based; GET may return 404/405, but should respond
      expect([200, 400, 404, 405].includes(response.status)).toBe(true);
    });

    it("should respond to POST with JSON-RPC", async () => {
      if (!serverReachable) return;

      const response = await mcpRequest(endpoint, "initialize", {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0" },
      });

      const text = await response.text();
      expect(text.length).toBeGreaterThan(0);

      // Try to parse as JSON
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        // If not JSON, just verify we got a response
        expect(text).toBeDefined();
        return;
      }

      // If JSON, should be JSON-RPC format
      expect(json.jsonrpc).toBe("2.0");
      // Should have either result or error
      expect(json.result !== undefined || json.error !== undefined).toBe(true);
    });

    it("should handle subpath requests (catch-all)", async () => {
      if (!serverReachable) return;

      const response = await fetch(`${BASE_URL}${endpoint}/sse`, {
        method: "OPTIONS",
      });

      // Catch-all should respond to subpaths
      expect(response.status).toBe(204);
    });
  });

  describe("/api/openai/mcp (OpenAI Apps enhanced server)", () => {
    const endpoint = "/api/openai/mcp";

    it("should respond to OPTIONS with CORS headers including MCP session", async () => {
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

    it("should respond to GET request", async () => {
      if (!serverReachable) return;

      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: "GET",
      });

      // MCP is POST-based; GET may return 404/405, but CORS headers should be present
      expect([200, 400, 404, 405].includes(response.status)).toBe(true);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    });

    it("should respond to POST with JSON-RPC", async () => {
      if (!serverReachable) return;

      const response = await mcpRequest(endpoint, "initialize", {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0" },
      });

      const text = await response.text();
      expect(text.length).toBeGreaterThan(0);

      let json;
      try {
        json = JSON.parse(text);
      } catch {
        expect(text).toBeDefined();
        return;
      }

      expect(json.jsonrpc).toBe("2.0");
      expect(json.result !== undefined || json.error !== undefined).toBe(true);
    });

    it("should handle subpath requests (catch-all)", async () => {
      if (!serverReachable) return;

      const response = await fetch(`${BASE_URL}${endpoint}/sse`, {
        method: "OPTIONS",
      });

      // Catch-all should handle subpaths with CORS headers
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    });
  });

  describe("list_resources tool", () => {
    it("should list list_resources tool on /api/mcp", async () => {
      if (!serverReachable) return;

      const json = await mcpRequestJson("/api/mcp", "tools/list", {});

      expect(json.jsonrpc).toBe("2.0");
      expect((json.result as { tools?: unknown })?.tools).toBeDefined();

      const tools = (json.result as { tools: Array<{ name: string }> }).tools;
      const listResourcesTool = tools.find((t) => t.name === "list_resources");
      expect(listResourcesTool).toBeDefined();
      expect(listResourcesTool?.name).toBe("list_resources");
    });

    it("should call list_resources and return resources on /api/mcp", async () => {
      if (!serverReachable) return;

      const json = await mcpRequestJson("/api/mcp", "tools/call", {
        name: "list_resources",
        arguments: {},
      });

      expect(json.jsonrpc).toBe("2.0");
      expect((json.result as { content?: unknown })?.content).toBeDefined();

      const content = (
        json.result as { content: Array<{ type: string; text: string }> }
      ).content;
      expect(content.length).toBeGreaterThan(0);
      expect(content[0].type).toBe("text");

      const resources = JSON.parse(content[0].text) as Array<{
        uri: string;
        name: string;
        description: string;
        type: string;
      }>;
      expect(resources.length).toBeGreaterThan(0);

      const firstResource = resources[0];
      expect(firstResource.uri).toBeDefined();
      expect(firstResource.name).toBeDefined();
      expect(firstResource.description).toBeDefined();
      expect(["recipe", "cookbook"]).toContain(firstResource.type);
    });

    it("should list list_resources tool on /api/openai/mcp", async () => {
      if (!serverReachable) return;

      const json = await mcpRequestJson("/api/openai/mcp", "tools/list", {});

      expect(json.jsonrpc).toBe("2.0");
      expect((json.result as { tools?: unknown })?.tools).toBeDefined();

      const tools = (json.result as { tools: Array<{ name: string }> }).tools;
      const listResourcesTool = tools.find((t) => t.name === "list_resources");
      expect(listResourcesTool).toBeDefined();
    });
  });

  describe("Endpoint differentiation", () => {
    it("both endpoints should be reachable", async () => {
      if (!serverReachable) return;

      const [mcpRes, openaiMcpRes] = await Promise.all([
        fetch(`${BASE_URL}/api/mcp`, { method: "OPTIONS" }),
        fetch(`${BASE_URL}/api/openai/mcp`, { method: "OPTIONS" }),
      ]);

      expect(mcpRes.status).toBe(204);
      expect(openaiMcpRes.status).toBe(204);
    });

    it("openai-mcp should have session headers that mcp does not", async () => {
      if (!serverReachable) return;

      const [mcpRes, openaiMcpRes] = await Promise.all([
        fetch(`${BASE_URL}/api/mcp`, { method: "OPTIONS" }),
        fetch(`${BASE_URL}/api/openai/mcp`, { method: "OPTIONS" }),
      ]);

      // Base MCP should NOT expose Mcp-Session-Id
      const mcpExposeHeaders =
        mcpRes.headers.get("Access-Control-Expose-Headers") || "";
      expect(mcpExposeHeaders.includes("Mcp-Session-Id")).toBe(false);

      // OpenAI MCP SHOULD expose Mcp-Session-Id
      const openaiExposeHeaders =
        openaiMcpRes.headers.get("Access-Control-Expose-Headers") || "";
      expect(openaiExposeHeaders.includes("Mcp-Session-Id")).toBe(true);
    });
  });
});
