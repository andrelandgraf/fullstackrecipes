"use client";

import { useState } from "react";
import { Copy, Check, Package, ChevronRight, FileCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { CodeBlock } from "@/components/code/code-block";

export type RegistryFile = {
  path: string;
  content: string;
  lightHtml: string;
  darkHtml: string;
};

interface RegistryTagClientProps {
  command: string;
  files: RegistryFile[];
}

function getFileExtension(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  return ext ?? "ts";
}

export function RegistryTagClient({ command, files }: RegistryTagClientProps) {
  const [commandCopied, setCommandCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const copyCommand = async () => {
    await navigator.clipboard.writeText(command);
    setCommandCopied(true);
    setTimeout(() => setCommandCopied(false), 2000);
  };

  return (
    <div className="my-6 rounded-lg border border-border/60 bg-gradient-to-b from-card/80 to-card/40 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 pb-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
          <Package className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Install via shadcn registry</p>
        </div>
        <span className="shrink-0 rounded-full border border-border/50 bg-muted/50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          optional
        </span>
      </div>

      {/* Install command */}
      <div className="group relative px-4 pb-3">
        <pre className="overflow-x-auto rounded-md border border-border bg-muted/30 px-3 py-2.5 font-mono text-[13px] leading-relaxed">
          <code className="text-foreground/90 whitespace-pre">{command}</code>
        </pre>
        <Button
          size="icon"
          variant="secondary"
          onClick={copyCommand}
          className="absolute right-6 top-1/2 h-7 w-7 -translate-y-1/2 opacity-60 transition-all hover:opacity-100 group-hover:opacity-100"
        >
          {commandCopied ? (
            <Check className="h-3.5 w-3.5 text-primary" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      {/* Collapsible source code */}
      {files.length > 0 && (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-2 border-t border-border/40 px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
            >
              <ChevronRight
                className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  isOpen && "rotate-90",
                )}
              />
              <FileCode className="h-4 w-4" />
              <span>Or copy source code</span>
              {files.length > 1 && (
                <span className="text-xs text-muted-foreground/70">
                  ({files.length} files)
                </span>
              )}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="flex flex-col gap-4 border-t border-border/40 p-4">
              {files.map((file) => {
                const ext = getFileExtension(file.path);
                return (
                  <CodeBlock
                    key={file.path}
                    filePath={file.path}
                    fileExt={ext}
                    language={ext}
                    code={file.content}
                    lightHtml={file.lightHtml}
                    darkHtml={file.darkHtml}
                    hasFilePath={true}
                    className="max-h-[400px] overflow-auto"
                  />
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
