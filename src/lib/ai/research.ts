import { Agent } from "./agent";

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

/**
 * Research agent that gathers information for tweet topics.
 */
export const researchAgent = new Agent({
  stepOptions: {
    model: "google/gemini-3-pro-preview",
    system: researchSystemPrompt,
    tools: "research",
    providerOptions: {
      google: {
        thinkingConfig: {
          thinkingBudget: 8000,
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
