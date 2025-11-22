import { InferAgentUIMessage, ToolLoopAgent, stepCountIs } from "ai";
import { DurableAgent } from "@workflow/ai/agent";
import { countCharactersTool } from "./tools";

// export const chatAgent = new DurableAgent({
//   model: async () => openai("gpt-5"),
//   stopWhen: stepCountIs(20),
//   instructions:
//     "You are a tweet generator. Generate only the tweet text itself - no explanations, no meta-commentary, no quotation marks around it. Just write the tweet content directly as if you are posting it. Keep it engaging, concise, and within typical tweet length.",
// });

export const chatAgent = new ToolLoopAgent({
  model: 'anthropic/claude-haiku-4-5',
  stopWhen: stepCountIs(20),
  tools: {
    countCharacters: countCharactersTool,
  },
  instructions:
    "You are a tweet generator. Generate only the tweet text itself - no explanations, no meta-commentary, no quotation marks around it. Just write the tweet content directly as if you are posting it. Keep it engaging, concise, and ensure to stay within the 280 character limit of a tweet.",
});

export type ChatAgentUIMessage = InferAgentUIMessage<typeof chatAgent>;

// Extract all part types for type safety
type MessagePart = ChatAgentUIMessage["parts"][0];

// Text part type
export type TextPart = Extract<MessagePart, { type: "text" }>;

// Reasoning part type
export type ReasoningPart = Extract<MessagePart, { type: "reasoning" }>;

// Tool part types
export type ToolPart = Extract<MessagePart, { type: `tool-${string}` }>;
export type CountCharactersToolPart = Extract<
  MessagePart,
  { type: "tool-countCharacters" }
>;
