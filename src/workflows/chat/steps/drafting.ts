import { streamText, type ModelMessage } from "ai";
import { type GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";
import { streamToWritable } from "@/lib/agents/stream";
import type { AgentStepResult } from "@/lib/agents/tool-loop";
import { draftingTools } from "@/lib/ai/tools";
import type { ChatAgentUIMessage } from "../types";
import { writeProgress } from "../progress";

const draftingSystemPrompt = `You are a tweet drafting agent.

Based on the research already gathered in the conversation, your job is to:
1. Draft a compelling tweet
2. Use the countCharacters tool to verify it's within Twitter's 280 character limit
3. Revise if needed to fit the limit while maintaining impact
4. Present the final tweet clearly for easy copying

Guidelines for great tweets:
- Be concise and punchy
- Lead with the hook
- Use line breaks strategically
- Avoid quotation marks around the tweet content
- No meta-commentary - just the tweet itself

After drafting, present the tweet in a code block for easy copying.`;

export async function draftingAgentStep(
  chatId: string,
  messageId: string,
  messages: ModelMessage[],
): Promise<AgentStepResult<ChatAgentUIMessage>> {
  "use step";

  await writeProgress("Drafting the tweet...", chatId, messageId);

  const resultStream = streamText({
    model: "google/gemini-3-pro-preview",
    system: draftingSystemPrompt,
    tools: draftingTools,
    messages,
    providerOptions: {
      google: {
        thinkingConfig: {
          thinkingBudget: 4000,
          includeThoughts: true,
        },
      } satisfies GoogleGenerativeAIProviderOptions,
    },
  });

  const { responseMessage, finishReason } =
    await streamToWritable<ChatAgentUIMessage>(resultStream, {
      sendStart: false,
      sendFinish: false,
      sendReasoning: true,
      sendSources: true,
    });

  return {
    shouldContinue: finishReason === "tool-calls",
    responseMessage,
    finishReason,
  };
}
