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

export function isToolPart(
  part: ChatAgentUIMessage["parts"][0],
): part is ChatToolPart {
  return part.type.startsWith("tool-");
}

export function TextPart({ part }: { part: ChatTextPart }) {
  if (part.text === "" && part.state === "streaming") {
    return <Loader size={16} />;
  }

  return <MessageResponse>{part.text}</MessageResponse>;
}

export function ReasoningPart({ part }: { part: ChatReasoningPart }) {
  const isStreaming = part.state === "streaming";
  return (
    <Reasoning isStreaming={isStreaming}>
      <ReasoningTrigger />
      <ReasoningContent>{part.text}</ReasoningContent>
    </Reasoning>
  );
}

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

export function DataProgressPart({ text }: { text: string }) {
  return (
    <div className="mb-2 rounded-md bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">
      {text}
    </div>
  );
}

export function FilePart({ part }: { part: ChatFilePart }) {
  return <MessageAttachment data={part} />;
}

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
