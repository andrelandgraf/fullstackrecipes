import { countCharactersTool } from "@/lib/agent-chat/tools";
import {
  convertToModelMessages,
  createUIMessageStream,
  streamText,
  UIMessage,
} from "ai";
import { v7 as uuidv7 } from "uuid";

export function errorHandler(error: unknown) {
  console.error("Error in chat agent", error);
  if (error == null) {
    return "unknown error";
  }

  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return JSON.stringify(error);
}

const messageHistory: UIMessage[] = [
  {
    role: "user",
    id: uuidv7(),
    parts: [
      {
        type: "text",
        text: "I just joined Neon as a Developer Advocate!",
      },
    ],
  },
];

const stream = createUIMessageStream({
  generateId: () => uuidv7(),
  execute: async ({ writer }) => {
    console.log("Execute function called");
    writer.write({
      type: "start",
    });
    writer.write({
      type: "data-progress",
      data: {
        text: "Multistep workflow started",
      },
    });

    let hasStopped = false;
    let stepCount = 0;
    const messages = convertToModelMessages([...messageHistory]);
    while (!hasStopped && stepCount < 20) {
      const resultStream = streamText({
        model: "google/gemini-3-pro-preview",
        system:
          "You are a helpful assistant that helps the user author tweets. Make sure to use the countCharacters tool to verify the tweet stays within Twitter's 280 character limit.",
        tools: {
          countCharactersTool,
        },
        messages,
        onFinish: ({ finishReason }) => {
          if (finishReason === "stop") {
            hasStopped = true;
          }
          stepCount++;
        },
      });
      const uiMessageStream = resultStream.toUIMessageStream({
        sendStart: false,
        sendFinish: false,
        sendReasoning: true,
        sendSources: true,
        generateMessageId: () => uuidv7(),
        onFinish: ({ responseMessage }) => {
          messages.push(...convertToModelMessages([responseMessage]));
        },
      });

      // Start consuming the stream and merge the UI message stream
      // Both operations can happen in parallel - merge() will pipe the stream to writer
      const consumePromise = resultStream.consumeStream();
      const mergePromise = writer.merge(uiMessageStream);

      // Wait for both to complete
      await Promise.all([consumePromise, mergePromise]);

      console.log(`Step ${stepCount} completed`);
    }

    writer.write({
      type: "finish",
    });
  },
  onFinish: async ({ responseMessage }) => {
    console.log("responseMessage", responseMessage);
  },
  onError: errorHandler,
});

const reader = stream.getReader();

console.log("Starting to read from stream...");
while (true) {
  const { done, value } = await reader.read();
  if (done) {
    console.log("Stream finished");
    break;
  }
  console.log("Received value:", JSON.stringify(value, null, 2));
}
