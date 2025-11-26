import { google } from "@ai-sdk/google";
import { tool } from "ai";
import { z } from "zod";

/**
 * Research tools - Google search for finding information
 * Note: Key names determine the tool type stored in database (tool-{keyName})
 */
export const researchTools = {
  googleSearch: google.tools.googleSearch({}) as any,
  urlContext: google.tools.urlContext({}) as any,
};

/**
 * Drafting tools - Character counting for tweet validation
 */
export const draftingTools = {
  countCharacters: tool({
    description:
      "Count the number of characters in a text. Use this to verify tweet length before finalizing.",
    inputSchema: z.object({
      text: z.string().describe("The text to count characters for"),
    }),
    execute: async ({ text }) => {
      const count = text.length;
      const remaining = 280 - count;
      return {
        characterCount: count,
        remainingCharacters: remaining,
        isWithinLimit: count <= 280,
        status:
          count <= 280
            ? `✓ ${count}/280 characters (${remaining} remaining)`
            : `✗ ${count}/280 characters (${Math.abs(remaining)} over limit)`,
      };
    },
  }),
};

/**
 * Combined tool set - all tools that can appear in UI messages
 */
export const allTools = {
  ...researchTools,
  ...draftingTools,
};

/**
 * Tool type names for database schema.
 * Single source of truth for tool types stored in the database.
 * Format: "tool-{toolName}" where toolName matches the key in allTools
 */
export const TOOL_TYPES = [
  "tool-googleSearch",
  "tool-urlContext",
  "tool-countCharacters",
] as const;

export type ToolType = (typeof TOOL_TYPES)[number];
