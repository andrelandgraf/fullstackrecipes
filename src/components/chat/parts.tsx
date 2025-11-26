"use client";

import { Loader } from "@/components/ai-elements/loader";
import {
  MessageAttachment,
  MessageResponse,
} from "@/components/ai-elements/message";
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
import {
  ChatAgentUIMessage,
  ChatTextPart,
  ChatReasoningPart,
  ChatSourceUrlPart,
  ChatToolPart,
  ChatDataProgressPart,
  ChatFilePart,
} from "@/workflows/chat/types";

/**
 * Type guard to check if a part is a tool part
 */
export function isToolPart(
  part: ChatAgentUIMessage["parts"][0],
): part is ChatToolPart {
  return part.type.startsWith("tool-");
}

/**
 * Renders a text part of a message
 */
export function TextPart({ part }: { part: ChatTextPart }) {
  if (part.text === "" && part.state === "streaming") {
    return <Loader size={16} />;
  }

  return <MessageResponse>{part.text}</MessageResponse>;
}

/**
 * Renders a reasoning/thinking part of a message
 */
export function ReasoningPart({ part }: { part: ChatReasoningPart }) {
  const isStreaming = part.state === "streaming";
  return (
    <Reasoning isStreaming={isStreaming}>
      <ReasoningTrigger />
      <ReasoningContent>{part.text}</ReasoningContent>
    </Reasoning>
  );
}

/**
 * Renders source citations from web search results
 */
export function SourcesPart({ parts }: { parts: ChatSourceUrlPart[] }) {
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

/**
 * Renders workflow progress updates
 */
export function DataProgressPart({ text }: { text: string }) {
  return (
    <div className="mb-2 rounded-md bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">
      {text}
    </div>
  );
}

/**
 * Renders a file attachment part
 */
export function FilePart({ part }: { part: ChatFilePart }) {
  return <MessageAttachment data={part} />;
}

/**
 * Renders a tool invocation part
 */
export function ToolPart({ part }: { part: ChatToolPart }) {
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
