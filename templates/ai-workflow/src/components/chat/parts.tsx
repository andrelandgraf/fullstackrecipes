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
  MessageAttachment,
  MessageResponse,
} from "@/components/ai-elements/message";
import type {
  ChatTextPart,
  ChatReasoningPart,
  ChatSourceUrlPart,
  ChatDataProgressPart,
  ChatFilePart,
  ChatToolPart,
} from "@/workflows/chat/types";

export function TextPart({ part }: { part: ChatTextPart }) {
  return <MessageResponse>{part.text}</MessageResponse>;
}

export function ReasoningPart({ part }: { part: ChatReasoningPart }) {
  return (
    <Reasoning>
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
        {parts.map((part, index) => (
          <Source key={index} href={part.url} title={part.title} />
        ))}
      </SourcesContent>
    </Sources>
  );
}

export function DataProgressPart({ part }: { part: ChatDataProgressPart }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground text-sm italic">
      <span className="size-2 animate-pulse rounded-full bg-primary" />
      {part.data.text}
    </div>
  );
}

export function FilePart({ part }: { part: ChatFilePart }) {
  return (
    <MessageAttachment
      data={{
        type: "file",
        url: part.url,
        mediaType: part.mediaType,
        filename: part.filename,
      }}
    />
  );
}

export function ToolPart({ part }: { part: ChatToolPart }) {
  return (
    <Tool>
      <ToolHeader title={part.title} type={part.type} state={part.state} />
      <ToolContent>
        <ToolInput input={part.input} />
        <ToolOutput
          output={part.state === "output-available" ? part.output : undefined}
          errorText={part.state === "output-error" ? part.errorText : undefined}
        />
      </ToolContent>
    </Tool>
  );
}
