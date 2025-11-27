import { generateObject, convertToModelMessages, type UIMessage } from "ai";
import { z } from "zod";
import { writeProgress } from "../progress";

const routerSystemPrompt = `You are an orchestrator agent for a tweet author system.

Analyze the conversation and determine what should happen next:

1. If the user provides a draft tweet idea, prompt, or topic that needs research:
   - Return { next: 'research' }

2. If research has been completed and the user confirms they want to proceed with drafting:
   - Return { next: 'drafting' }

3. If the user has feedback or questions about the research, or wants more information:
   - Return { next: 'research' }

4. If the conversation is just starting with a new tweet request:
   - Return { next: 'research' }

Look at the conversation history to understand the current state.`;

const routerSchema = z.object({
  next: z.enum(["research", "drafting"]).describe("The next agent to invoke"),
  reasoning: z
    .string()
    .describe("Brief explanation of why this route was chosen"),
});

export type RouterDecision = z.infer<typeof routerSchema>;

export async function routerStep(
  chatId: string,
  messageId: string,
  history: UIMessage[],
): Promise<RouterDecision> {
  "use step";

  await writeProgress("Thinking about the next step...", chatId, messageId);

  try {
    console.log("Router: Processing", history.length, "messages");

    const result = await generateObject({
      model: "google/gemini-2.5-flash",
      system: routerSystemPrompt,
      schema: routerSchema,
      messages: convertToModelMessages(history),
    });

    console.log("Router decision:", result.object);

    return result.object;
  } catch (error) {
    console.error("Router error:", error);
    console.error("Messages:", JSON.stringify(history, null, 2));
    throw error;
  }
}
