"use client";

import { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TemplateCloneContentProps {
  template: string;
}

export function TemplateCloneContent({ template }: TemplateCloneContentProps) {
  const [copied, setCopied] = useState(false);

  const degitCommand = `npx tiged ${template} my-app`;
  const githubUrl = `https://github.com/${template}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(degitCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-medium text-foreground">
          Clone with tiged
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-md bg-muted px-3 py-2 font-mono text-sm">
            {degitCommand}
          </code>
          <Button
            variant="outline"
            size="icon"
            onClick={handleCopy}
            className="shrink-0"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            <span className="sr-only">Copy command</span>
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Then run <code className="rounded bg-muted px-1">cd my-app</code> and{" "}
          <code className="rounded bg-muted px-1">bun install</code>
        </p>
      </div>

      <div className="border-t pt-4">
        <p className="mb-2 text-sm font-medium text-foreground">
          Review on GitHub
        </p>
        <div>
          <Button variant="outline" className="gap-2" asChild>
            <a href={githubUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
              View Template Files
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
