import { streamText, type ModelMessage } from "ai";
import { type GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";
import { streamToWritable } from "@/lib/agents/stream";
import type { AgentStepResult } from "@/lib/agents/tool-loop";
import { researchTools } from "@/lib/ai/tools";
import type { ChatAgentUIMessage } from "../types";
import { writeProgress } from "../progress";

const researchSystemPrompt = `You are a research agent for a tweet authoring system.

Your job is to:
1. Analyze the user's tweet topic or idea
2. Research relevant information using web search
3. Find authoritative sources and context
4. Summarize your findings clearly
5. Ask the user to confirm your understanding before proceeding

When researching:
- Look up companies, technologies, people, or concepts mentioned
- Find recent news or updates if relevant
- Cite your sources so the user can verify

After presenting your research, ask the user:
"Does this capture what you want to convey? Should I proceed to drafting the tweet?"

Do NOT draft the tweet yet - just gather and present research.`;

export async function researchAgentStep(
  chatId: string,
  messageId: string,
  messages: ModelMessage[],
): Promise<AgentStepResult<ChatAgentUIMessage>> {
  "use step";

  await writeProgress("Researching the topic...", chatId, messageId);

  const resultStream = streamText({
    model: "google/gemini-3-pro-preview",
    system: researchSystemPrompt,
    tools: researchTools,
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
