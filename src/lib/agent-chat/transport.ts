import { DefaultChatTransport } from "ai";

interface ResumableTransportOptions {
  streamingMessageId: string | null;
  setStreamingMessageId: (id: string | null) => void;
  baseUrl?: string;
}

/**
 * Create a resumable transport for useChat that uses S2 streams
 *
 * This transport:
 * - Sends POST /api/chat/messages to trigger the DurableAgent workflow
 * - Gets back a message ID
 * - Subscribes to GET /api/chat/messages/:id for SSE
 * - Supports reconnection by re-subscribing to the same stream
 */
export function createResumableTransport({
  streamingMessageId,
  setStreamingMessageId,
  baseUrl = "/api/chat/messages",
}: ResumableTransportOptions) {
  return new DefaultChatTransport({
    async prepareSendMessagesRequest({ messages, id }) {
      // Get the last message (the new user message)
      const message = messages[messages.length - 1];

      // Extract the text content from the message
      const textPart = message.parts.find((part) => part.type === "text");
      if (!textPart || textPart.type !== "text") {
        throw new Error("Message must have a text part");
      }

      return {
        body: {
          chatId: id,
          messageText: textPart.text,
        },
      };
    },

    prepareReconnectToStreamRequest: (data) => {
      // For reconnection, add a header to indicate it's a reconnect
      return {
        ...data,
        headers: { ...data.headers, "x-is-reconnect": "true" },
      };
    },

    fetch: async (input, init) => {
      const headers = new Headers(init?.headers);

      // If this is a reconnection, use GET with the streamingMessageId
      if (headers.get("x-is-reconnect") === "true") {
        if (!streamingMessageId) {
          throw new Error("No streaming message ID available for reconnection");
        }
        return fetch(`${baseUrl}/${streamingMessageId}`, {
          ...init,
          method: "GET",
        });
      }

      // Post the message to the workflow and get the message ID
      const postResponse = await fetch(input, init);
      const { messageId } = await postResponse.json();

      // Store the message ID for reconnection
      setStreamingMessageId(messageId);

      // Subscribe to the SSE stream for this message
      const streamResponse = await fetch(`${baseUrl}/${messageId}`, {
        method: "GET",
      });

      return streamResponse;
    },
  });
}
