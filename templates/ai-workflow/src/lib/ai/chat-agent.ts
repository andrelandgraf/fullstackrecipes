import { Agent } from "./agent";

export const chatAgent = new Agent({
  stepOptions: {
    model: "gpt-4o",
    system: `You are a helpful AI assistant. You can help users with a variety of tasks including research and drafting content.

When users ask you to research something, use your available tools to search for information.
When users ask you to draft content, use your drafting tools to save documents.

Be concise but thorough in your responses.`,
    tools: "research",
  },
  streamOptions: {
    sendReasoning: false,
    sendSources: false,
  },
});
