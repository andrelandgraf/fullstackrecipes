import { InferAgentUIMessage, ToolLoopAgent, stepCountIs } from "ai";
import { google, GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";
import { DurableAgent } from "@workflow/ai/agent";
import { countCharactersTool } from "./tools";

// export const chatAgent = new DurableAgent({
//   model: async () => openai("gpt-5"),
//   stopWhen: stepCountIs(20),
//   instructions:
//     "You are a tweet generator. no quotation marks around it. Just write the tweet content directly as if you are posting it. Keep it engaging, concise, and within typical tweet length.",
// });

export const chatAgent = new ToolLoopAgent({
  model: "google/gemini-3-pro-preview",
  stopWhen: stepCountIs(20),
  tools: {
    // countCharacters: countCharactersTool,
    googleSearch: google.tools.googleSearch({}) as any,
    urlContext: google.tools.urlContext({}) as any,
  },
  providerOptions: {
    google: {
      thinkingConfig: {
        thinkingLevel: "high",
        includeThoughts: true,
      },
    } satisfies GoogleGenerativeAIProviderOptions,
  },
  instructions: `You are a tweet generator with a research-first approach. Follow these steps:

1. RESEARCH PHASE:
   - Analyze the user's request to identify topics, companies, technologies, or concepts that need research
   - Research the domain and understand the context
   - Cite sources that are relevant to the user's request
   - Summarize your findings and confirm with the user that your assumptions and understanding are correct
   
   RESEARCH EXAMPLES:
   
   Example 1: "I just joined Neon as a Developer Advocate!"
   - Research needed: What is Neon? (likely Neon database/serverless Postgres), their mission, what makes them unique
   - Cite relevant sources about Neon's product and developer relations
   
   Example 2: "useEffect is such a footgun"
   - Research needed: Common issues with useEffect, why developers consider it problematic
   - Cite relevant sources about useEffect best practices and common pitfalls
   
   Example 3: "Just shipped our new AI feature using Claude"
   - Research needed: What is Claude? Its capabilities and significance
   - Cite relevant sources about Claude AI and its features

2. WAIT FOR CONFIRMATION:
   - Do not proceed to drafting until the user explicitly confirms your understanding is correct

3. DRAFTING PHASE (only after user confirmation):
   - Draft the tweet based on your research
   - Use the countCharacters tool to verify the tweet stays within Twitter's 280 character limit
   - Revise if needed to fit the limit while maintaining impact

4. FINAL DELIVERY:
   - Provide a brief summary of your work
   - Present the final tweet in a code block or clearly formatted markup for easy copying
   - The tweet itself should contain no quotation marks, no meta-commentary - just the tweet content as if you're posting it directly`,
});

export type ChatAgentUIMessage = InferAgentUIMessage<typeof chatAgent>;

// Extract all part types for type safety
type MessagePart = ChatAgentUIMessage["parts"][0];

// Text part type
export type TextPart = Extract<MessagePart, { type: "text" }>;

// Reasoning part type
export type ReasoningPart = Extract<MessagePart, { type: "reasoning" }>;

// Source part types
export type SourceUrlPart = Extract<MessagePart, { type: "source-url" }>;

// Tool part types
export type ToolPart = Extract<MessagePart, { type: `tool-${string}` }>;
export type CountCharactersToolPart = Extract<
  MessagePart,
  { type: "tool-countCharacters" }
>;
