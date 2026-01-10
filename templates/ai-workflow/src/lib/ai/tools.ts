import { tool } from "ai";
import { z } from "zod";

/**
 * Research tools for gathering information
 */
export const researchTools = {
  webSearch: tool({
    description: "Search the web for information on a topic",
    inputSchema: z.object({
      query: z.string().describe("The search query"),
    }),
    execute: async ({ query }: { query: string }) => {
      // Implement your web search logic here
      // This is a placeholder that returns mock results
      return {
        results: [
          {
            title: `Search result for: ${query}`,
            url: "https://example.com",
            snippet: "This is a placeholder search result.",
          },
        ],
      };
    },
  }),
};

/**
 * Drafting tools for content generation
 */
export const draftingTools = {
  countCharacters: tool({
    description:
      "Count the number of characters in a text. Use this to verify tweet length before finalizing.",
    inputSchema: z.object({
      text: z.string().describe("The text to count characters for"),
    }),
    execute: async ({ text }: { text: string }) => {
      const count = text.length;
      const remaining = 280 - count;
      return {
        characterCount: count,
        remainingCharacters: remaining,
        isWithinLimit: count <= 280,
        status:
          count <= 280
            ? `${count}/280 characters (${remaining} remaining)`
            : `${count}/280 characters (${Math.abs(remaining)} over limit)`,
      };
    },
  }),
  saveDocument: tool({
    description: "Save a document draft",
    inputSchema: z.object({
      title: z.string().describe("Document title"),
      content: z.string().describe("Document content"),
    }),
    execute: async ({ title, content }: { title: string; content: string }) => {
      // Implement document saving logic here
      return {
        saved: true,
        title,
        contentLength: content.length,
      };
    },
  }),
};

export const allTools = {
  ...researchTools,
  ...draftingTools,
};

// Tool type names for database schema - must match keys in allTools as "tool-{key}"
export const TOOL_TYPES = [
  "tool-webSearch",
  "tool-countCharacters",
  "tool-saveDocument",
] as const;

export type ToolType = (typeof TOOL_TYPES)[number];
