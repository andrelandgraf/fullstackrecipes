"use client";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAttachments,
  MessageContent,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputButton,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
} from "@/components/ai-elements/prompt-input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ChatAgentUIMessage,
  ChatSourceUrlPart,
  ChatDataProgressPart,
  ChatFilePart,
} from "@/workflows/chat/types";
import { useResumableChat } from "@/hooks/use-resumable-chat";
import { AlertCircleIcon, PaperclipIcon } from "lucide-react";
import {
  isToolPart,
  TextPart,
  ReasoningPart,
  SourcesPart,
  DataProgressPart,
  FilePart,
  ToolPart,
} from "./parts";

function FileUploadButton() {
  const attachments = usePromptInputAttachments();

  return (
    <PromptInputButton
      type="button"
      onClick={() => attachments.openFileDialog()}
      aria-label="Upload files"
    >
      <PaperclipIcon className="size-4" />
    </PromptInputButton>
  );
}

function MessageWithParts({ message }: { message: ChatAgentUIMessage }) {
  const sources = message.parts.filter(
    (part): part is ChatSourceUrlPart => part.type === "source-url",
  );

  const fileParts = message.parts.filter(
    (part): part is ChatFilePart => part.type === "file",
  );

  const dataProgressParts = message.parts.filter(
    (part): part is ChatDataProgressPart => part.type === "data-progress",
  );
  const latestDataProgress = dataProgressParts[dataProgressParts.length - 1];

  return (
    <Message from={message.role}>
      <MessageContent>
        {latestDataProgress && (
          <DataProgressPart text={latestDataProgress.data.text} />
        )}
        {fileParts.length > 0 && (
          <MessageAttachments>
            {fileParts.map((part, index) => (
              <FilePart key={index} part={part} />
            ))}
          </MessageAttachments>
        )}
        {message.parts.map((part, index) => {
          if (part.type === "text") {
            return <TextPart key={index} part={part} />;
          }
          if (part.type === "reasoning") {
            return <ReasoningPart key={index} part={part} />;
          }
          if (part.type === "source-url") {
            return null;
          }
          if (part.type === "data-progress") {
            return null;
          }
          if (part.type === "file") {
            return null;
          }
          if (isToolPart(part)) {
            return <ToolPart key={index} part={part} />;
          }
          return null;
        })}
        {sources.length > 0 && <SourcesPart parts={sources} />}
      </MessageContent>
    </Message>
  );
}

export function SimpleChat({
  messageHistory,
  chatId,
  initialRunId,
}: {
  messageHistory: ChatAgentUIMessage[];
  chatId: string;
  initialRunId?: string;
}) {
  const { messages, sendMessage, status, error } = useResumableChat({
    chatId,
    messageHistory,
    initialRunId,
  });

  return (
    <div className="flex h-full flex-col">
      <Conversation>
        <ConversationContent>
          {messages.map((message) => (
            <MessageWithParts key={message.id} message={message} />
          ))}

          {error && (
            <div className="px-4">
              <Alert variant="destructive">
                <AlertCircleIcon />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  {error.message ||
                    "An error occurred while processing your request. Please try again."}
                </AlertDescription>
              </Alert>
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <PromptInput
        multiple
        onSubmit={(message) => {
          if (message.text.trim() || message.files.length > 0) {
            sendMessage({
              text: message.text,
              files: message.files,
            });
          }
        }}
      >
        <PromptInputAttachments>
          {(attachment) => (
            <PromptInputAttachment key={attachment.id} data={attachment} />
          )}
        </PromptInputAttachments>
        <PromptInputTextarea placeholder="Say something..." />
        <PromptInputFooter>
          <FileUploadButton />
          <PromptInputTools>
            <PromptInputSubmit status={status} />
          </PromptInputTools>
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}
