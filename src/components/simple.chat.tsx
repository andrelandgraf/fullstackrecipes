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
  CountCharactersToolPart,
  TextPart as TextPartType,
  ReasoningPart as ReasoningPartType,
  SourceUrlPart as SourceUrlPartType,
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

function SourcesPart({ parts }: { parts: SourceUrlPartType[] }) {
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

// function ToolCountCharacters({ part }: { part: CountCharactersToolPart }) {
//   const output = part.output;

//   return (
//     <Tool>
//       <ToolHeader
//         type={part.type}
//         state={part.state}
//         title="Count Characters"
//       />
//       <ToolContent>
//         <div className="max-w-full overflow-hidden">
//           {part.input !== undefined && (
//             <div className="max-h-48 overflow-auto">
//               <ToolInput input={part.input} />
//             </div>
//           )}
//           {output && (
//             <div className="space-y-2 p-4">
//               <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
//                 Result
//               </h4>
//               <div className="space-y-3 rounded-md bg-muted/50 p-4">
//                 <div className="flex items-center justify-between">
//                   <span className="text-sm text-muted-foreground">
//                     Total Characters:
//                   </span>
//                   <span className="font-mono text-lg font-semibold">
//                     {output.characterCount}
//                   </span>
//                 </div>
//                 {output.characterCountWithoutSpaces !== undefined && (
//                   <div className="flex items-center justify-between">
//                     <span className="text-sm text-muted-foreground">
//                       Without Spaces:
//                     </span>
//                     <span className="font-mono text-lg font-semibold">
//                       {output.characterCountWithoutSpaces}
//                     </span>
//                   </div>
//                 )}
//               </div>
//             </div>
//           )}
//         </div>
//       </ToolContent>
//     </Tool>
//   );
// }

function ToolPart({ part }: { part: ToolPartType }) {
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
    (part): part is SourceUrlPartType => part.type === "source-url",
  );

  return (
    <Message from={message.role}>
      <MessageContent>
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
  console.log("messages", messages);

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
