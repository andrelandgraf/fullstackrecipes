"use client";

import { useResumableChat } from "@/hooks/use-resumable-chat";
import type { ChatAgentUIMessage } from "@/workflows/chat/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { useRef, useEffect } from "react";

interface ChatProps {
  chatId: string;
  messageHistory: ChatAgentUIMessage[];
  initialRunId?: string;
}

export function Chat({ chatId, messageHistory, initialRunId }: ChatProps) {
  const { messages, input, handleInputChange, handleSubmit, status } =
    useResumableChat({
      chatId,
      messageHistory,
      initialRunId,
    });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isLoading = status === "streaming" || status === "submitted";

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Start a conversation by typing a message below.
          </div>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              {message.parts.map((part, index) => {
                if (part.type === "text") {
                  return (
                    <p key={index} className="whitespace-pre-wrap">
                      {part.text}
                    </p>
                  );
                }
                if (part.type === "tool-invocation") {
                  return (
                    <div
                      key={index}
                      className="text-xs text-muted-foreground italic"
                    >
                      Using tool: {part.toolInvocation.toolName}
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={handleInputChange}
            placeholder="Type your message..."
            className="min-h-[60px] resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as unknown as React.FormEvent);
              }
            }}
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !input.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
