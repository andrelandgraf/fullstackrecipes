import { chatAgent } from "@/lib/agent-chat/agent";
import { UIMessage, createAgentUIStreamResponse } from "ai";

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  return createAgentUIStreamResponse({
    agent: chatAgent,
    messages: messages,
  });
}
