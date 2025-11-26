import type { MessageWithParts } from "@/lib/db/queries";
import { TOOL_TYPES, type ChatAgentUIMessage } from "@/workflows/chat/types";
import { db } from "@/lib/db/client";
import {
  messages,
  messageTexts,
  messageReasoning,
  messageTools,
  messageSourceUrls,
  messageData,
  messageFiles,
  messageSourceDocuments,
  type NewMessageText,
  type NewMessageReasoning,
  type NewMessageTool,
  type NewMessageSourceUrl,
  type NewMessageData,
  type NewMessageFile,
  type NewMessageSourceDocument,
} from "@/lib/db/schema";
import { v7 as uuidv7 } from "uuid";
import assert from "@/lib/common/assert";

/**
 * Parse provider metadata from database format to UI format.
 * Handles empty objects, null, and undefined by returning undefined.
 */
function parseMetadata(metadata: unknown): any {
  if (!metadata) return undefined;
  if (typeof metadata !== "object") return undefined;
  if (Object.keys(metadata).length === 0) return undefined;
  return metadata;
}

/**
 * Convert database messages with parts to ChatAgentUIMessage format
 */
export function convertDbMessagesToUIMessages(
  messageHistory: MessageWithParts[],
): ChatAgentUIMessage[] {
  return messageHistory.map((msg) => {
    const uiParts: ChatAgentUIMessage["parts"] = [];
    // Add step-start part to the beginning of every message
    uiParts.push({
      type: "step-start",
    });

    // Map persisted database parts to UI message parts
    for (const part of msg.parts) {
      let uiPart: ChatAgentUIMessage["parts"][0];
      switch (part.type) {
        case "text":
          uiPart = {
            type: "text",
            text: part.text,
            state: "done",
            providerMetadata: parseMetadata(part.providerMetadata),
          };
          break;
        case "tool":
          // Cast to any because TOOL_TYPES (source of truth) may have more tools
          // than TypeScript's InferUITools can infer from allTools
          if (part.state === "output-available") {
            uiPart = {
              type: part.toolType,
              toolCallId: part.toolCallId,
              state: "output-available",
              input: part.input,
              output: part.output,
              callProviderMetadata: parseMetadata(part.callProviderMetadata),
            } as any;
          } else if (part.state === "output-error") {
            assert(part.errorText !== null, "Error text is required");
            uiPart = {
              type: part.toolType,
              toolCallId: part.toolCallId,
              state: "output-error",
              errorText: part.errorText ?? "",
              input: part.input,
              callProviderMetadata: parseMetadata(part.callProviderMetadata),
            } as any;
          } else if (part.state === "output-denied") {
            assert(part.approvalId !== null, "Approval ID is required");
            uiPart = {
              type: part.toolType,
              toolCallId: part.toolCallId,
              state: "output-denied",
              approval: {
                id: part.approvalId,
                approved: false,
                reason: part.approvalReason || "",
              },
              input: part.input,
              callProviderMetadata: parseMetadata(part.callProviderMetadata),
            } as any;
          } else {
            throw new Error(`Unknown part state ${part.state}`);
          }
          break;
        case "reasoning":
          uiPart = {
            type: "reasoning",
            text: part.text,
            providerMetadata: parseMetadata(part.providerMetadata),
          };
          break;
        case "source-url":
          uiPart = {
            type: "source-url",
            sourceId: part.sourceId,
            url: part.url,
            title: part.title ?? undefined,
            providerMetadata: parseMetadata(part.providerMetadata),
          };
          break;
        case "data": {
          uiPart = {
            type: part.dataType as `data-${string}`,
            data: part.data,
          } as ChatAgentUIMessage["parts"][0];
          break;
        }
        case "file":
          uiPart = {
            type: "file",
            mediaType: part.mediaType,
            url: part.url,
            filename: part.filename ?? undefined,
            providerMetadata: parseMetadata(part.providerMetadata),
          };
          break;
        case "source-document":
          uiPart = {
            type: "source-document",
            sourceId: part.sourceId,
            mediaType: part.mediaType,
            title: part.title,
            filename: part.filename ?? undefined,
            providerMetadata: parseMetadata(part.providerMetadata),
          };
          break;
        default:
          throw new Error(`Unknown part ${JSON.stringify(part)}`);
      }
      uiParts.push(uiPart);
    }

    return {
      id: msg.id,
      role: msg.role,
      parts: uiParts,
    };
  });
}

/**
 * Insert message parts into database
 * Used for both initial message creation and updating existing messages
 * Pre-generates UUID v7 IDs for parts in order to maintain sequence
 */
export async function insertMessageParts(
  chatId: string,
  messageId: string,
  parts: ChatAgentUIMessage["parts"],
) {
  // Group inserts by table for efficient bulk insertion
  const textInserts: Array<NewMessageText> = [];
  const reasoningInserts: Array<NewMessageReasoning> = [];
  const toolInserts: Array<NewMessageTool> = [];
  const sourceUrlInserts: Array<NewMessageSourceUrl> = [];
  const dataInserts: Array<NewMessageData> = [];
  const fileInserts: Array<NewMessageFile> = [];
  const sourceDocumentInserts: Array<NewMessageSourceDocument> = [];

  // Process each part in order, generating UUID v7 IDs sequentially
  for (const part of parts) {
    // Skip step-start and other non-persistable parts
    if (part.type === "step-start") {
      continue;
    }

    if (part.type === "text" && "text" in part && part.text.trim()) {
      textInserts.push({
        id: uuidv7(),
        messageId,
        chatId,
        text: part.text,
        providerMetadata: part.providerMetadata,
      });
    } else if (
      part.type === "reasoning" &&
      "text" in part &&
      part.text.trim()
    ) {
      reasoningInserts.push({
        id: uuidv7(),
        messageId,
        chatId,
        text: part.text,
        providerMetadata: part.providerMetadata,
      });
    } else if (part.type.startsWith("tool-")) {
      assert(
        TOOL_TYPES.includes(part.type as any),
        `Invalid tool type: ${part.type}. Valid types: ${TOOL_TYPES.join(", ")}`,
      );
      // Cast to any since TypeScript can't narrow tool part types properly
      // Runtime validation is done above with TOOL_TYPES.includes()
      const toolPart = part as any;
      if (toolPart.state === "output-available") {
        toolInserts.push({
          id: uuidv7(),
          messageId,
          chatId,
          input: toolPart.input,
          toolCallId: toolPart.toolCallId,
          toolType: toolPart.type,
          callProviderMetadata: toolPart.callProviderMetadata,
          title: toolPart.title,
          providerExecuted: toolPart.providerExecuted,
          output: toolPart.output,
          state: "output-available",
        });
      } else if (toolPart.state === "output-error") {
        toolInserts.push({
          id: uuidv7(),
          messageId,
          chatId,
          input: toolPart.input,
          toolCallId: toolPart.toolCallId,
          toolType: toolPart.type,
          callProviderMetadata: toolPart.callProviderMetadata,
          title: toolPart.title,
          providerExecuted: toolPart.providerExecuted,
          errorText: toolPart.errorText,
          state: "output-error",
        });
      } else if (toolPart.state === "output-denied") {
        assert(!!toolPart.approval?.id, "Approval ID is required");
        toolInserts.push({
          id: uuidv7(),
          messageId,
          chatId,
          input: toolPart.input,
          toolCallId: toolPart.toolCallId,
          toolType: toolPart.type,
          callProviderMetadata: toolPart.callProviderMetadata,
          title: toolPart.title,
          providerExecuted: toolPart.providerExecuted,
          state: "output-denied",
          approvalId: toolPart.approval?.id,
          approvalReason: toolPart.approval?.reason,
          approved: false,
        });
      }
    } else if (part.type === "source-url") {
      sourceUrlInserts.push({
        id: uuidv7(),
        messageId,
        chatId,
        sourceId: part.sourceId,
        url: part.url,
        title: part.title,
        providerMetadata: part.providerMetadata,
      });
    } else if (part.type.startsWith("data-")) {
      // Store the full type name in the database as dataType
      if (part.type === "data-progress") {
        dataInserts.push({
          id: uuidv7(),
          messageId,
          chatId,
          dataType: part.type,
          data: part.data,
        });
      } else {
        throw new Error(`Unknown data type ${part.type}`);
      }
    } else if (part.type === "file") {
      fileInserts.push({
        id: uuidv7(),
        messageId,
        chatId,
        mediaType: part.mediaType,
        filename: part.filename ?? null,
        url: part.url,
        providerMetadata: part.providerMetadata ?? null,
      });
    } else if (part.type === "source-document") {
      sourceDocumentInserts.push({
        id: uuidv7(),
        messageId,
        chatId,
        sourceId: part.sourceId,
        mediaType: part.mediaType,
        title: part.title,
        filename: part.filename ?? null,
        providerMetadata: part.providerMetadata ?? null,
      });
    }
  }

  // Execute all inserts in parallel (order preserved by pre-generated UUIDs)
  const insertPromises = [];

  if (textInserts.length > 0) {
    insertPromises.push(db.insert(messageTexts).values(textInserts));
  }
  if (reasoningInserts.length > 0) {
    insertPromises.push(db.insert(messageReasoning).values(reasoningInserts));
  }
  if (toolInserts.length > 0) {
    insertPromises.push(db.insert(messageTools).values(toolInserts));
  }
  if (sourceUrlInserts.length > 0) {
    insertPromises.push(db.insert(messageSourceUrls).values(sourceUrlInserts));
  }
  if (dataInserts.length > 0) {
    insertPromises.push(db.insert(messageData).values(dataInserts));
  }
  if (fileInserts.length > 0) {
    insertPromises.push(db.insert(messageFiles).values(fileInserts));
  }
  if (sourceDocumentInserts.length > 0) {
    insertPromises.push(
      db.insert(messageSourceDocuments).values(sourceDocumentInserts),
    );
  }

  if (insertPromises.length > 0) {
    await Promise.all(insertPromises);
  }
}

/**
 * Persist a single UI message to the database
 * Takes a ChatAgentUIMessage and saves it with its parts
 */
export async function persistMessage({
  chatId,
  message: uiMessage,
  runId,
}: {
  chatId: string;
  message: ChatAgentUIMessage;
  runId?: string | null;
}) {
  // Insert the message record
  // Only include id if it's a valid non-empty string, otherwise let DB generate it
  const [{ messageId }] = await db
    .insert(messages)
    .values({
      id: uiMessage.id || undefined,
      chatId,
      role: uiMessage.role,
      runId: runId || null,
    })
    .returning({ messageId: messages.id });

  // Insert all parts
  await insertMessageParts(chatId, messageId, uiMessage.parts);
}
