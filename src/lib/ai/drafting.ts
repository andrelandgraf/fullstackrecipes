import { Agent } from "./agent";

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

/**
 * Drafting agent that creates tweet drafts based on research.
 */
export const draftingAgent = new Agent({
  stepOptions: {
    model: "google/gemini-3-pro-preview",
    system: draftingSystemPrompt,
    tools: "drafting",
    providerOptions: {
      google: {
        thinkingConfig: {
          thinkingBudget: 4000,
          includeThoughts: true,
        },
      },
    },
  },
  streamOptions: {
    sendReasoning: true,
    sendSources: true,
  },
});
