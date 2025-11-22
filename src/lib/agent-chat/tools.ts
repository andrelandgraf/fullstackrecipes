import { z } from "zod";
import { tool } from "ai";

export const countCharactersTool = tool({
  description: "Count the number of characters in a given text",
  inputSchema: z.object({
    text: z.string().describe("The text to count characters in"),
  }),
  execute: async ({ text }) => ({
    text,
    characterCount: text.length,
    characterCountWithoutSpaces: text.replace(/\s/g, "").length,
  }),
});
