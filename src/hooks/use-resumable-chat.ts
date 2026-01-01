"use client";

import { useChat } from "@ai-sdk/react";
import { WorkflowChatTransport } from "@workflow/ai";
import { v7 as uuidv7 } from "uuid";
import type { ChatAgentUIMessage } from "@/workflows/chat/types";
import { useRef } from "react";

interface UseResumableChatOptions {
  chatId: string;
  messageHistory: ChatAgentUIMessage[];
  /** Initial workflow run ID for resuming an interrupted stream */
  initialRunId?: string;
}

/**
 * Custom hook that wraps useChat with WorkflowChatTransport for resumable streaming.
 *
 * Uses useStateRef to track the active workflow run ID, enabling automatic
 * reconnection to interrupted streams without stale closure issues.
 */
export function useResumableChat({
  chatId,
  messageHistory,
  initialRunId,
}: UseResumableChatOptions) {
  const activeRunIdRef = useRef<string | undefined>(initialRunId);

  const chatResult = useChat<ChatAgentUIMessage>({
    messages: messageHistory,
    resume: !!initialRunId,
    transport: new WorkflowChatTransport({
      // Send new messages
      prepareSendMessagesRequest: ({ messages }) => ({
        api: `/api/chats/${chatId}/messages`,
        body: {
          chatId,
          message: messages[messages.length - 1],
        },
      }),

      // Store the workflow run ID when a message is sent
      onChatSendMessage: (response) => {
        const workflowRunId = response.headers.get("x-workflow-run-id");
        if (workflowRunId) {
          activeRunIdRef.current = workflowRunId;
        }
      },

      // Configure reconnection to use the ref for the latest value
      prepareReconnectToStreamRequest: ({ api, ...rest }) => {
        const currentRunId = activeRunIdRef.current;
        if (!currentRunId) {
          throw new Error("No active workflow run ID found for reconnection");
        }
        return {
          ...rest,
          api: `/api/chats/${chatId}/messages/${encodeURIComponent(currentRunId)}/stream`,
        };
      },

      // Clear the workflow run ID when the chat stream ends
      onChatEnd: () => {
        activeRunIdRef.current = undefined;
      },

      // Retry up to 5 times on reconnection errors
      maxConsecutiveErrors: 5,
    }),
    id: chatId,
    generateId: () => uuidv7(),
  });

  return {
    ...chatResult,
  };
}
