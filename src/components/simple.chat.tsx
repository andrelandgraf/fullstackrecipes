"use client";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Loader } from "@/components/ai-elements/loader";
import {
  Message,
  MessageAttachment,
  MessageAttachments,
  MessageContent,
  MessageResponse,
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
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ai-elements/sources";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ChatAgentUIMessage,
  ChatTextPart,
  ChatReasoningPart,
  ChatSourceUrlPart,
  ChatToolPart,
  ChatDataProgressPart,
  ChatFilePart,
} from "@/workflows/chat/types";
import { useResumableChat } from "@/hooks/use-resumable-chat";
import { AlertCircleIcon, PaperclipIcon } from "lucide-react";

// Type guard to check if a part is a tool part
function isToolPart(
  part: ChatAgentUIMessage["parts"][0],
): part is ChatToolPart {
  return part.type.startsWith("tool-");
}

function TextPart({ part }: { part: ChatTextPart }) {
  if (part.text === "" && part.state === "streaming") {
    return <Loader size={16} />;
  }

  return <MessageResponse>{part.text}</MessageResponse>;
}

function ReasoningPart({ part }: { part: ChatReasoningPart }) {
  const isStreaming = part.state === "streaming";
  return (
    <Reasoning isStreaming={isStreaming}>
      <ReasoningTrigger />
      <ReasoningContent>{part.text}</ReasoningContent>
    </Reasoning>
  );
}

function SourcesPart({ parts }: { parts: ChatSourceUrlPart[] }) {
  if (parts.length === 0) return null;

  return (
    <Sources>
      <SourcesTrigger count={parts.length} />
      <SourcesContent>
        {parts.map((source, index) => (
          <Source
            key={index}
            href={source.url}
            title={source.title || source.url}
          />
        ))}
      </SourcesContent>
    </Sources>
  );
}

function DataProgressPart({ text }: { text: string }) {
  return (
    <div className="mb-2 rounded-md bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">
      {text}
    </div>
  );
}

function FilePart({ part }: { part: ChatFilePart }) {
  return <MessageAttachment data={part} />;
}

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

function ToolPart({ part }: { part: ChatToolPart }) {
  // if (part.type === "tool-countCharacters") {
  //   return <ToolCountCharacters part={part as CountCharactersToolPart} />;
  // }

  // Generic tool rendering for other tools
  return (
    <Tool>
      <ToolHeader type={part.type} state={part.state} />
      <ToolContent>
        <div className="max-w-full overflow-hidden">
          {part.input !== undefined && (
            <div className="max-h-48 overflow-auto">
              <ToolInput input={part.input} />
            </div>
          )}
          {(part.output !== undefined || part.errorText !== undefined) && (
            <div className="max-h-96 overflow-auto">
              <ToolOutput output={part.output} errorText={part.errorText} />
            </div>
          )}
        </div>
      </ToolContent>
    </Tool>
  );
}

function MessageWithParts({ message }: { message: ChatAgentUIMessage }) {
  // Collect all sources from the message
  const sources = message.parts.filter(
    (part): part is ChatSourceUrlPart => part.type === "source-url",
  );

  // Collect all file parts
  const fileParts = message.parts.filter(
    (part): part is ChatFilePart => part.type === "file",
  );

  // Collect all data-progress parts and get the latest one
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
            return null; // Already displayed above
          }
          if (part.type === "file") {
            return null; // Already displayed above
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
  /** Initial workflow run ID for resuming an interrupted stream */
  initialRunId?: string;
}) {
  const { messages, sendMessage, status, error } = useResumableChat({
    chatId,
    messageHistory,
    initialRunId,
  });

  return (
    <div className="flex h-screen flex-col">
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
