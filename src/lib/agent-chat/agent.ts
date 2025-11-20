import { InferAgentUIMessage, ToolLoopAgent, stepCountIs } from "ai";
import { DurableAgent } from "@workflow/ai/agent";
import { openai } from "@ai-sdk/openai";

// export const chatAgent = new DurableAgent({
//   model: async () => openai("gpt-5"),
//   stopWhen: stepCountIs(20),
//   instructions:
//     "You are a tweet generator. Generate only the tweet text itself - no explanations, no meta-commentary, no quotation marks around it. Just write the tweet content directly as if you are posting it. Keep it engaging, concise, and within typical tweet length.",
// });

export const chatAgent = new ToolLoopAgent({
  model: openai("gpt-5"),
  stopWhen: stepCountIs(20),
  instructions:
    "You are a tweet generator. Generate only the tweet text itself - no explanations, no meta-commentary, no quotation marks around it. Just write the tweet content directly as if you are posting it. Keep it engaging, concise, and within typical tweet length.",
});

export type ChatAgentUIMessage = InferAgentUIMessage<typeof chatAgent>;
