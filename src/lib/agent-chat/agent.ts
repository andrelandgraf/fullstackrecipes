import { stepCountIs, ToolSet, streamText, convertToModelMessages } from "ai";
import { DurableAgent } from "@workflow/ai/agent";
import { google, GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";
import { InferUITools, JSONValue, UIMessage, UIMessagePart } from "ai";
import z from "zod";

const systemPrompt = `You are a tweet generator with a research-first approach. Follow these steps:

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
   - The tweet itself should contain no quotation marks, no meta-commentary - just the tweet content as if you're posting it directly`;

const tools: ToolSet = {
  webSearch: google.tools.googleSearch({}) as any,
  urlContext: google.tools.urlContext({}) as any,
};

export const metadataSchema = z.object({});
type ChatMetadata = z.infer<typeof metadataSchema>;

export const dataPartSchema = z.object({
  progress: z.object({
    text: z.string(),
  }),
});
export type ChatDataPart = z.infer<typeof dataPartSchema>;

export type ChatToolSet = InferUITools<typeof tools>;
export type ChatTextPart = Extract<ChatUIMessagePart, { type: "text" }>;
export type ChatReasoningPart = Extract<
  ChatUIMessagePart,
  { type: "reasoning" }
>;
export type ChatSourceUrlPart = Extract<
  ChatUIMessagePart,
  { type: "source-url" }
>;
export type ChatToolPart = Extract<
  ChatUIMessagePart,
  { type: `tool-${string}` }
>;
export type ChatDataProgressPart = Extract<
  ChatUIMessagePart,
  { type: "data-progress" }
>;
export type ChatFilePart = Extract<ChatUIMessagePart, { type: "file" }>;

export type ChatAgentUIMessage = UIMessage<
  ChatMetadata,
  ChatDataPart,
  ChatToolSet
>;
export type ChatUIMessagePart = UIMessagePart<ChatDataPart, ChatToolSet>;
export type ChatProviderMetadata = Record<string, Record<string, JSONValue>>;

export const durableChatAgent = new DurableAgent({
  model: "google/gemini-3-pro-preview",
  system: systemPrompt,
  tools,
});

export function durableChatAgentStream(
  writable: WritableStream,
  messages: ChatAgentUIMessage[],
) {
  return durableChatAgent.stream({
    writable,
    messages: convertToModelMessages(messages),
    sendStart: false,
    stopWhen: stepCountIs(20),
  });
}

export function chatAgent(messages: ChatAgentUIMessage[]) {
  return streamText({
    model: google("gemini-3-pro-preview"),
    stopWhen: stepCountIs(20),
    tools,
    providerOptions: {
      google: {
        thinkingConfig: {
          thinkingLevel: "high",
          includeThoughts: true,
        },
      } satisfies GoogleGenerativeAIProviderOptions,
    },
    messages: convertToModelMessages(messages),
    system: systemPrompt,
  });
}
