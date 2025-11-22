"use client";

import { useChat } from "@ai-sdk/react";
import { WorkflowChatTransport } from "@workflow/ai";
import { useState } from "react";
import type { UIMessage } from "@ai-sdk/react";

interface ChatProps {
  chatId: string;
  messageHistory: UIMessage[];
  initialStreamingMessageId: string | null;
}

export function Chat({
  chatId,
  messageHistory,
  initialStreamingMessageId,
}: ChatProps) {
  // Initialize streamingMessageId - if the last message has a streamId, it's still streaming
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    initialStreamingMessageId,
  );

  const { messages, sendMessage, status } = useChat({
    id: chatId,
    // Resume if we're reconnecting to a pending AI response
    resume: Boolean(
      messageHistory.at(-1)?.id &&
        messageHistory.at(-1)?.id === streamingMessageId,
    ),
    messages: messageHistory,
    transport: new WorkflowChatTransport({
      onChatSendMessage: (response, options) => {
        // Save chat history to localStorage
        localStorage.setItem("chat-history", JSON.stringify(options.messages));
        // Extract and store the workflow run ID for session resumption
        const workflowRunId = response.headers.get("x-workflow-run-id");
        if (workflowRunId) {
          localStorage.setItem("active-workflow-run-id", workflowRunId);
        }
      },
      onChatEnd: ({ chatId, chunkIndex }) => {
        console.log(`Chat ${chatId} completed with ${chunkIndex} chunks`);
        // Clear the active run ID when chat completes
        localStorage.removeItem("active-workflow-run-id");
      },
    }),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const input = formData.get("message") as string;
    if (!input || input.trim() === "") return;

    sendMessage({
      text: input,
    });

    // Clear input
    (e.target as HTMLFormElement).reset();
  };

  // Count words in text
  const countWords = (text: string) => {
    return text.trim().split(/\s+/).filter(Boolean).length;
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="w-full max-w-3xl mx-auto flex flex-col h-screen">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            Tweet Generator Chat
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Chat: {chatId.slice(0, 8)}...
          </p>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-400 dark:text-gray-500">
                <p className="text-lg mb-2">Start generating tweets</p>
                <p className="text-sm">
                  Ask me to write a tweet about anything
                </p>
              </div>
            </div>
          ) : (
            messages.map((message) => {
              const text = message.parts
                .filter((part) => part.type === "text")
                .map((part) => part.text)
                .join("");

              if (message.role === "user") {
                return (
                  <div key={message.id} className="flex justify-end">
                    <div className="max-w-[85%] bg-blue-500 text-white rounded-2xl px-4 py-3">
                      <p className="text-sm whitespace-pre-wrap">{text}</p>
                    </div>
                  </div>
                );
              }

              // Assistant message styled as a tweet
              const wordCount = countWords(text);
              return (
                <div key={message.id} className="flex justify-start">
                  <div className="max-w-[85%] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
                    {/* Tweet Header */}
                    <div className="px-4 pt-3 pb-2 flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                        AI
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white text-sm">
                          Tweet Generator
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          @ai_tweets
                        </p>
                      </div>
                    </div>

                    {/* Tweet Content */}
                    <div className="px-4 pb-3">
                      <p className="text-gray-900 dark:text-white whitespace-pre-wrap leading-relaxed">
                        {text}
                      </p>
                    </div>

                    {/* Tweet Footer */}
                    <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-medium">{wordCount} words</span>
                        <span>
                          {new Date().toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Loading indicator */}
          {status === "streaming" && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Section */}
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
          <form onSubmit={handleSubmit} className="flex space-x-3">
            <input
              type="text"
              name="message"
              placeholder="Ask me to write a tweet..."
              disabled={status !== "ready"}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={status !== "ready"}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-semibold py-3 px-8 rounded-full transition-colors duration-200 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </form>
          <div className="mt-2 text-xs text-gray-400 dark:text-gray-500 text-center">
            Status: {status}
          </div>
        </div>
      </main>
    </div>
  );
}
