"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeSelector } from "@/components/themes/selector";

export default function Page() {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
  });
  const [input, setInput] = useState("");

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b p-4 flex justify-between items-center">
        <h1 className="text-lg font-semibold">AI Chat</h1>
        <ThemeSelector />
      </header>

      <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
        <div className="space-y-4 pb-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={message.role === "user" ? "text-right" : "text-left"}
            >
              <span className="font-medium">
                {message.role === "user" ? "You" : "AI"}:
              </span>{" "}
              {message.parts.map((part, index) =>
                part.type === "text" ? (
                  <span key={index}>{part.text}</span>
                ) : null,
              )}
            </div>
          ))}
        </div>

        <form
          className="flex gap-2 mt-auto"
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim()) {
              sendMessage({ text: input });
              setInput("");
            }
          }}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={status !== "ready"}
            placeholder="Say something..."
            className="flex-1"
          />
          <Button type="submit" disabled={status !== "ready"}>
            Send
          </Button>
        </form>
      </main>
    </div>
  );
}
