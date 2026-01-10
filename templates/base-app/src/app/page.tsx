"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { MessageSquare } from "lucide-react";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
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
} from "@/components/ai-elements/prompt-input";
import { ThemeSelector } from "@/components/themes/selector";

export default function Page() {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
  });

  const isLoading = status === "submitted" || status === "streaming";

  return (
    <div className="flex flex-col h-screen">
      <header className="border-b p-4 flex justify-between items-center shrink-0">
        <h1 className="text-lg font-semibold">AI Chat</h1>
        <ThemeSelector />
      </header>

      <Conversation className="flex-1">
        <ConversationContent className="max-w-2xl mx-auto w-full">
          {messages.length === 0 ? (
            <ConversationEmptyState
              icon={<MessageSquare className="size-8" />}
              title="Start a conversation"
              description="Send a message to begin chatting with the AI assistant."
            />
          ) : (
            messages.map((message) => (
              <Message key={message.id} from={message.role}>
                <MessageContent>
                  {message.parts.map((part, index) =>
                    part.type === "text" ? (
                      <MessageResponse key={index}>{part.text}</MessageResponse>
                    ) : null,
                  )}
                </MessageContent>
              </Message>
            ))
          )}
          {isLoading && messages.at(-1)?.role === "user" && (
            <Message from="assistant">
              <MessageContent>
                <Loader size={20} />
              </MessageContent>
            </Message>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t p-4 shrink-0">
        <div className="max-w-2xl mx-auto">
          <PromptInput
            onSubmit={({ text }) => {
              if (text.trim()) {
                sendMessage({ text });
              }
            }}
          >
            <PromptInputTextarea
              disabled={isLoading}
              placeholder="Send a message..."
            />
            <PromptInputFooter>
              <div />
              <PromptInputSubmit disabled={isLoading} status={status} />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}
