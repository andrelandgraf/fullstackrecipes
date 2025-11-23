"use client";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Loader } from "@/components/ai-elements/loader";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
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
  CountCharactersToolPart,
  TextPart as TextPartType,
  ReasoningPart as ReasoningPartType,
  ToolPart as ToolPartType,
} from "@/lib/agent-chat/agent";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { AlertCircleIcon } from "lucide-react";
import { v7 as uuidv7 } from "uuid";

// Type guard to check if a part is a tool part
function isToolPart(
  part: ChatAgentUIMessage["parts"][0],
): part is ToolPartType {
  return part.type.startsWith("tool-");
}

function TextPart({ part }: { part: TextPartType }) {
  if (part.text === "" && part.state === "streaming") {
    return <Loader size={16} />;
  }

  return <MessageResponse>{part.text}</MessageResponse>;
}

function ReasoningPart({ part }: { part: ReasoningPartType }) {
  const isStreaming = part.state === "streaming";
  return (
    <Reasoning isStreaming={isStreaming}>
      <ReasoningTrigger />
      <ReasoningContent>{part.text}</ReasoningContent>
    </Reasoning>
  );
}

function ToolCountCharacters({ part }: { part: CountCharactersToolPart }) {
  const output = part.output as
    | { characterCount?: number; characterCountWithoutSpaces?: number }
    | undefined;

  return (
    <Tool>
      <ToolHeader
        type={part.type}
        state={part.state}
        title="Count Characters"
      />
      <ToolContent>
        {part.input !== undefined && <ToolInput input={part.input} />}
        {output && (
          <div className="space-y-2 p-4">
            <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
              Result
            </h4>
            <div className="space-y-3 rounded-md bg-muted/50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Total Characters:
                </span>
                <span className="font-mono text-lg font-semibold">
                  {output.characterCount}
                </span>
              </div>
              {output.characterCountWithoutSpaces !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Without Spaces:
                  </span>
                  <span className="font-mono text-lg font-semibold">
                    {output.characterCountWithoutSpaces}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </ToolContent>
    </Tool>
  );
}

function ToolPart({ part }: { part: ToolPartType }) {
  if (part.type === "tool-countCharacters") {
    return <ToolCountCharacters part={part} />;
  }

  return (
    <Tool>
      <ToolHeader type={part.type} state={part.state} />
      <ToolContent>
        {part.input !== undefined && <ToolInput input={part.input} />}
        {(part.output !== undefined || part.errorText !== undefined) && (
          <ToolOutput output={part.output} errorText={part.errorText} />
        )}
      </ToolContent>
    </Tool>
  );
}

export function SimpleChat({
  messageHistory,
  chatId,
}: {
  messageHistory: ChatAgentUIMessage[];
  chatId: string;
}) {
  const { messages, sendMessage, status, error } = useChat<ChatAgentUIMessage>({
    messages: messageHistory,
    transport: new DefaultChatTransport({
      api: `/api/chats/${chatId}/messages`,
      prepareSendMessagesRequest: ({ messages }) => {
        return {
          body: {
            chatId,
            message: messages[messages.length - 1],
          },
        };
      },
    }),
    id: chatId,
    generateId: () => uuidv7(),
  });
  console.log("messages", JSON.stringify(messages, null, 2));

  return (
    <div className="flex h-screen flex-col">
      <Conversation>
        <ConversationContent>
          {messages.map((message) => (
            <Message key={message.id} from={message.role}>
              <MessageContent>
                {message.parts.map((part, index) => {
                  if (part.type === "text") {
                    return <TextPart key={index} part={part} />;
                  }
                  if (part.type === "reasoning") {
                    return <ReasoningPart key={index} part={part} />;
                  }
                  if (isToolPart(part)) {
                    return <ToolPart key={index} part={part} />;
                  }
                  return null;
                })}
              </MessageContent>
            </Message>
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
        onSubmit={(message) => {
          if (message.text.trim()) {
            sendMessage({ text: message.text });
          }
        }}
      >
        <PromptInputTextarea placeholder="Say something..." />
        <PromptInputFooter>
          <div />
          <PromptInputTools>
            <PromptInputSubmit status={status} />
          </PromptInputTools>
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}
