"use client";

import { useState } from "react";
import { Copy, Check, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";

/** A copyable command box that renders multi-line commands as a code block. */
export function CommandBox({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  async function copyCommand() {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-start gap-2 rounded-lg border border-border/50 bg-secondary/30 px-3 py-2.5">
      <Terminal className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <pre className="flex-1 overflow-x-auto whitespace-pre font-mono text-xs text-foreground/90 sm:text-sm">
        <code>{command}</code>
      </pre>
      <Button
        variant="ghost"
        size="sm"
        onClick={copyCommand}
        className="h-7 w-7 shrink-0 p-0"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-green-500" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </Button>
    </div>
  );
}

type Step = {
  title: string;
  description?: string;
  content: React.ReactNode;
};

/**
 * Renders the numbered steps for adding fullstackrecipes to a coding agent
 * via Markdown fetching (curl) instead of the MCP server.
 */
export function FetchMarkdownSteps({ steps }: { steps: Step[] }) {
  return (
    <div className="flex min-w-0 flex-col gap-6 sm:gap-8">
      {steps.map((step, index) => (
        <div key={step.title} className="min-w-0">
          <div className="flex items-start gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary sm:h-8 sm:w-8">
              {index + 1}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-medium">{step.title}</h4>
              {step.description && (
                <p className="text-sm text-muted-foreground">
                  {step.description}
                </p>
              )}
            </div>
          </div>
          <div className="mt-3 min-w-0 sm:mt-4">{step.content}</div>
        </div>
      ))}
    </div>
  );
}
