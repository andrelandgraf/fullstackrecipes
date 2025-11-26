import { streamText, type ModelMessage } from "ai";
import { google, type GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";
import type { ChatAgentUIMessage } from "@/lib/agent-chat/agent";
import type { AgentLoopResult, ChatWritableStream } from "../types";

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

// Tools for the agent
const tools = {
  webSearch: google.tools.googleSearch({}) as any,
  urlContext: google.tools.urlContext({}) as any,
};

/**
 * Execute one iteration of the agent loop
 *
 * This step:
 * 1. Calls streamText with the current message history
 * 2. Pipes the UI message stream to the workflow's writable
 * 3. Returns whether to continue and the response message for accumulation
 */
export async function agentLoopStep(
  writable: ChatWritableStream,
  messages: ModelMessage[],
): Promise<AgentLoopResult> {
  "use step";

  const writer = writable.getWriter();
  let responseMessage: ChatAgentUIMessage | null = null;

  // Create the streamText result
  const resultStream = streamText({
    model: "google/gemini-3-pro-preview",
    system: systemPrompt,
    tools,
    messages,
    providerOptions: {
      google: {
        thinkingConfig: {
          thinkingBudget: 8000,
          includeThoughts: true,
        },
      } satisfies GoogleGenerativeAIProviderOptions,
    },
  });

  // Convert to UI message stream
  // sendStart: false - we sent our own start at workflow level
  // sendFinish: false - we'll send our own finish at workflow level
  const uiStream = resultStream.toUIMessageStream({
    sendStart: false,
    sendFinish: false,
    sendReasoning: true,
    sendSources: true,
    onFinish: ({ responseMessage: msg }) => {
      responseMessage = msg as ChatAgentUIMessage;
    },
  });

  // Pipe the UI stream chunks to the workflow's writable
  try {
    const reader = uiStream.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        await writer.write(value);
      }
    } finally {
      reader.releaseLock();
    }

    // Ensure the result stream is fully consumed (triggers onFinish callbacks)
    await resultStream.consumeStream();
  } finally {
    writer.releaseLock();
  }

  // Await finishReason directly from the result (TypeScript-friendly)
  const finishReason = await resultStream.finishReason;
  const shouldContinue = finishReason === "tool-calls";

  return {
    shouldContinue,
    responseMessage: responseMessage!,
  };
}
