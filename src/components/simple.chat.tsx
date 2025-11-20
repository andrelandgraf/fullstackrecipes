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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ChatAgentUIMessage } from "@/lib/agent-chat/agent";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type TextUIPart } from "ai";
import { AlertCircleIcon } from "lucide-react";

type ReasoningUIPart = {
  type: "reasoning";
  text: string;
  state?: "streaming" | "done";
};

function TextPart({ part }: { part: TextUIPart }) {
  if (part.text === "" && part.state === "streaming") {
    return <Loader size={16} />;
  }

  return <MessageResponse>{part.text}</MessageResponse>;
}

function ReasoningPart({ part }: { part: ReasoningUIPart }) {
  const isStreaming = part.state === "streaming";
  return (
    <Reasoning isStreaming={isStreaming}>
      <ReasoningTrigger />
      <ReasoningContent>{part.text}</ReasoningContent>
    </Reasoning>
  );
}

export function SimpleChat() {
  const { messages, sendMessage, status, error } = useChat<ChatAgentUIMessage>({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
  });
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
