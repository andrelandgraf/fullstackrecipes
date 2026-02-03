"use client";

import { useState, useEffect } from "react";
import { codeToHtml, type BundledLanguage } from "shiki";
import { Copy, Check, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";

export const MCP_INSTALL_FULLSTACKRECIPES_COMMAND =
  "bunx add-mcp https://fullstackrecipes.com/api/mcp";

// Shared Hooks
export function useHighlightedCode(code: string, language: BundledLanguage) {
  const [html, setHtml] = useState<{ light: string; dark: string } | null>(
    null,
  );

  useEffect(() => {
    let mounted = true;
    Promise.all([
      codeToHtml(code, { lang: language, theme: "one-light" }),
      codeToHtml(code, { lang: language, theme: "one-dark-pro" }),
    ]).then(([light, dark]) => {
      if (mounted) {
        setHtml({ light, dark });
      }
    });
    return () => {
      mounted = false;
    };
  }, [code, language]);

  return html;
}

export function McpConfigSection({
  command = MCP_INSTALL_FULLSTACKRECIPES_COMMAND,
}: {
  command?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyCommand() {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-secondary/30 px-3 py-2.5">
      <Terminal className="h-4 w-4 shrink-0 text-muted-foreground" />
      <code className="flex-1 overflow-x-auto whitespace-nowrap font-mono text-xs text-foreground/90 sm:text-sm">
        {command}
      </code>
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

// Reusable MCP Setup Steps Component
type McpSetupStepsProps = {
  promptText: string;
  copiedPrompt: boolean;
  onCopyPrompt: () => void;
  step1Title?: string;
  step1Description?: string;
  step1Content?: React.ReactNode;
  step2Title?: string;
  step2Description?: string;
  /** Optional content to render as Step 2 between step 1 and prompt */
  step2Content?: React.ReactNode;
  mcpCommand?: string;
};

export function McpSetupSteps({
  promptText,
  copiedPrompt,
  onCopyPrompt,
  step1Title = "Add MCP server to your agent",
  step1Description = "Run once to update all detected agents",
  step1Content,
  step2Title,
  step2Description,
  step2Content,
  mcpCommand,
}: McpSetupStepsProps) {
  const resolvedStep1Content = step1Content ?? (
    <McpConfigSection command={mcpCommand} />
  );

  return (
    <div className="flex min-w-0 flex-col gap-6 sm:gap-8">
      {/* Step 1 */}
      <div className="min-w-0">
        <div className="flex items-start gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary sm:h-8 sm:w-8">
            1
          </div>
          <div className="min-w-0">
            <h4 className="font-medium">{step1Title}</h4>
            {step1Description && (
              <p className="text-sm text-muted-foreground">
                {step1Description}
              </p>
            )}
          </div>
        </div>

        <div className="mt-3 min-w-0 sm:mt-4">{resolvedStep1Content}</div>
      </div>

      {/* Step 2 */}
      {step2Content && (
        <div className="min-w-0">
          <div className="flex items-start gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary sm:h-8 sm:w-8">
              2
            </div>
            <div className="min-w-0 flex-1">
              {step2Title && <h4 className="font-medium">{step2Title}</h4>}
              {step2Description && (
                <p className="text-sm text-muted-foreground">
                  {step2Description}
                </p>
              )}
            </div>
          </div>

          <div className="mt-4">{step2Content}</div>
        </div>
      )}

      {/* Step 3: Prompt your agent */}
      <div className="min-w-0">
        <div className="flex items-start gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary sm:h-8 sm:w-8">
            3
          </div>
          <div className="min-w-0">
            <h4 className="font-medium">
              Ask your coding agent to follow the recipe
            </h4>
            <p className="text-sm text-muted-foreground">
              The agent can fetch recipes directly via MCP resources
            </p>
          </div>
        </div>

        <div className="mt-3 min-w-0 rounded-lg border border-dashed border-border bg-secondary/30 p-3 sm:mt-4 sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0 flex-1 overflow-x-auto">
              <span className="whitespace-nowrap font-mono text-xs text-muted-foreground sm:text-sm">
                {promptText}
              </span>
            </div>
            <Button
              size="sm"
              variant={copiedPrompt ? "secondary" : "default"}
              onClick={onCopyPrompt}
              className="w-full shrink-0 gap-2 sm:w-auto"
            >
              {copiedPrompt ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
