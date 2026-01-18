"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CopyableCodeBoxProps = {
  code: string;
  className?: string;
  /** If true, text will truncate instead of scroll on overflow. Default: false (scroll) */
  truncate?: boolean;
};

export function CopyableCodeBox({
  code,
  className,
  truncate = false,
}: CopyableCodeBoxProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-lg border border-dashed border-border bg-secondary/30 p-3 sm:p-4",
        className,
      )}
    >
      <div className={cn("min-w-0 flex-1", truncate ? "" : "overflow-x-auto")}>
        <code
          className={cn(
            "font-mono text-xs text-muted-foreground sm:text-sm",
            truncate ? "block truncate" : "whitespace-nowrap",
          )}
        >
          {code}
        </code>
      </div>
      <Button
        variant="outline"
        size="icon"
        onClick={handleCopy}
        className="h-8 w-8 shrink-0"
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
        <span className="sr-only">Copy command</span>
      </Button>
    </div>
  );
}
