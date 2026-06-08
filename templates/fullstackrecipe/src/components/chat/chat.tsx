"use client";

import { MessageSquare } from "lucide-react";
import { useResumableChat } from "@/hooks/use-resumable-chat";
import {
  type ChatAgentUIMessage,
  type ChatSourceUrlPart,
  isToolPart,
  isDataProgressPart,
} from "@/workflows/chat/types";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageAttachments,
  MessageAttachment,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  PromptInputActionMenu,
  PromptInputActionMenuTrigger,
  PromptInputActionMenuContent,
  PromptInputActionAddAttachments,
  PromptInputAttachments,
  PromptInputAttachment,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { Loader } from "@/components/ai-elements/loader";
import {
  TextPart,
  ReasoningPart,
  SourcesPart,
  DataProgressPart,
  FilePart,
  ToolPart,
} from "./parts";

interface ChatProps {
  chatId: string;
  messageHistory: ChatAgentUIMessage[];
  initialRunId?: string;
}

export function Chat({ chatId, messageHistory, initialRunId }: ChatProps) {
  const { messages, sendMessage, status } = useResumableChat({
    chatId,
    messageHistory,
    initialRunId,
  });

  const isLoading = status === "submitted" || status === "streaming";

  return (
    <div className="flex size-full flex-col">
      <Conversation className="flex-1">
        {messages.length === 0 ? (
          <ConversationEmptyState
            title="Start a conversation"
            description="Type a message below to begin"
            icon={<MessageSquare className="size-8" />}
          />
        ) : (
          <ConversationContent>
            {messages.map((message) => (
              <MessageItem key={message.id} message={message} />
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader size={16} />
                <span className="text-sm">Thinking...</span>
              </div>
            )}
          </ConversationContent>
        )}
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t p-4">
        <PromptInput
          accept="image/*"
          multiple
          onSubmit={({ text, files }) => {
            if (!text.trim() && files.length === 0) return;
            sendMessage({
              text,
              files: files.map((f) => ({
                type: "file" as const,
                url: f.url,
                mediaType: f.mediaType,
              })),
            });
          }}
        >
          <PromptInputAttachments>
            {(attachment) => <PromptInputAttachment data={attachment} />}
          </PromptInputAttachments>
          <PromptInputTextarea placeholder="Type a message..." />
          <PromptInputFooter>
            <PromptInputTools>
              <PromptInputActionMenu>
                <PromptInputActionMenuTrigger />
                <PromptInputActionMenuContent>
                  <PromptInputActionAddAttachments />
                </PromptInputActionMenuContent>
              </PromptInputActionMenu>
            </PromptInputTools>
            <PromptInputSubmit status={status} disabled={status !== "ready"} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}

function MessageItem({ message }: { message: ChatAgentUIMessage }) {
  const sourceUrls: ChatSourceUrlPart[] = [];

  return (
    <Message from={message.role}>
      <MessageContent>
        {/* Render file attachments for user messages */}
        {message.role === "user" && (
          <MessageAttachments>
            {message.parts
              .filter((p) => p.type === "file")
              .map((p, i) => (
                <MessageAttachment
                  key={i}
                  data={{
                    type: "file",
                    url: p.url,
                    mediaType: p.mediaType,
                    filename: p.filename,
                  }}
                />
              ))}
          </MessageAttachments>
        )}

        {/* Render message parts */}
        {message.parts.map((part, index) => {
          if (part.type === "step-start") {
            return null;
          }

          if (part.type === "text" && "text" in part && part.text.trim()) {
            return <TextPart key={index} part={part} />;
          }

          if (part.type === "reasoning" && "text" in part && part.text.trim()) {
            return <ReasoningPart key={index} part={part} />;
          }

          if (part.type === "source-url") {
            sourceUrls.push(part);
            return null;
          }

          if (isDataProgressPart(part)) {
            return <DataProgressPart key={index} part={part} />;
          }

          if (part.type === "file") {
            return <FilePart key={index} part={part} />;
          }

          if (isToolPart(part)) {
            return <ToolPart key={index} part={part} />;
          }

          return null;
        })}

        {/* Render collected source URLs at the end */}
        {sourceUrls.length > 0 && <SourcesPart parts={sourceUrls} />}
      </MessageContent>
    </Message>
  );
}
