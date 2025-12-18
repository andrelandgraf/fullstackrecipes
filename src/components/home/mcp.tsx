"use client";

import { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import { useQueryState, parseAsBoolean } from "nuqs";
import { codeToHtml, type BundledLanguage } from "shiki";
import { CodeBlock } from "@/components/code/code-block";
import { TabbedCodeBlock } from "@/components/code/tabbed-code-block";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Server, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCursorPromptDeeplink } from "@/lib/recipes/data";

// MCP Configuration Constants
export const MCP_CONFIG = `{
  "mcpServers": {
    "fullstackrecipes": {
      "url": "https://fullstackrecipes.com/api/mcp"
    }
  }
}`;

export const CURSOR_MCP_INSTALL_URL =
  "https://cursor.com/en-US/install-mcp?name=fullstackrecipes&config=eyJ1cmwiOiJodHRwczovL2Z1bGxzdGFja3JlY2lwZXMuY29tL2FwaS9tY3AifQ%3D%3D";

export const CLAUDE_CODE_MCP_COMMAND =
  "claude mcp add --transport http fullstackrecipes https://fullstackrecipes.com/api/mcp";

export const VSCODE_MCP_CONFIG = `{
  "servers": {
    "fullstackrecipes": {
      "type": "http",
      "url": "https://fullstackrecipes.com/api/mcp"
    }
  }
}`;

export const VSCODE_MCP_INSTALL_URL = `vscode:mcp/install?${encodeURIComponent(
  JSON.stringify({
    fullstackrecipes: {
      type: "http",
      url: "https://fullstackrecipes.com/api/mcp",
    },
  }),
)}`;

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

// Utility Functions
function getFileExtension(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase();
  return ext ?? "file";
}

// Shared Components
type McpCodeBlockProps = {
  code: string;
  language: BundledLanguage;
  filePath?: string;
  className?: string;
};

export function McpCodeBlock({
  code,
  language,
  filePath,
  className,
}: McpCodeBlockProps) {
  const html = useHighlightedCode(code, language);

  if (!html) {
    return (
      <div className={`rounded-md border bg-background p-4 ${className ?? ""}`}>
        <pre className="overflow-x-auto font-mono text-sm">
          <code>{code}</code>
        </pre>
      </div>
    );
  }

  return (
    <CodeBlock
      filePath={filePath ?? null}
      fileExt={filePath ? getFileExtension(filePath) : null}
      language={language}
      code={code}
      lightHtml={html.light}
      darkHtml={html.dark}
      hasFilePath={!!filePath}
      className={className}
    />
  );
}

export function CursorButton({
  href,
  children,
}: {
  href: string;
  children: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary"
    >
      <Image
        src="/assets/cursor-logo-light.svg"
        alt="Cursor"
        width={18}
        height={18}
        className="dark:hidden"
      />
      <Image
        src="/assets/cursor-logo-dark.svg"
        alt="Cursor"
        width={18}
        height={18}
        className="hidden dark:block"
      />
      {children}
    </a>
  );
}

export function VSCodeButton({
  href,
  children,
}: {
  href: string;
  children: string;
}) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary"
    >
      <Image
        src="/assets/vscode-logo.svg"
        alt="VS Code"
        width={18}
        height={18}
      />
      {children}
    </a>
  );
}

// MCP Client Types
export type McpClient = "cursor" | "claude-code" | "vscode";

const MCP_TABS = [
  {
    id: "cursor" as const,
    label: "Cursor",
    code: MCP_CONFIG,
    language: "json" as const,
    filePath: ".cursor/mcp.json",
  },
  {
    id: "vscode" as const,
    label: "VS Code",
    code: VSCODE_MCP_CONFIG,
    language: "json" as const,
    filePath: ".vscode/mcp.json",
  },
  {
    id: "claude-code" as const,
    label: "Claude Code",
    code: CLAUDE_CODE_MCP_COMMAND,
    language: "bash" as const,
  },
];

// Reusable MCP Config Section Component
type McpConfigSectionProps = {
  mcpClient: McpClient;
  setMcpClient: (client: McpClient) => void;
  showAddButtons?: boolean;
};

export function McpConfigSection({
  mcpClient,
  setMcpClient,
  showAddButtons = true,
}: McpConfigSectionProps) {
  return (
    <div className="flex min-w-0 flex-col overflow-hidden">
      <TabbedCodeBlock
        tabs={MCP_TABS}
        activeTab={mcpClient}
        onTabChange={(tabId) => setMcpClient(tabId as McpClient)}
      />

      {/* Add Buttons */}
      {showAddButtons && (
        <div className="mt-3 sm:mt-4">
          {mcpClient === "cursor" && (
            <CursorButton href={CURSOR_MCP_INSTALL_URL}>
              Add to Cursor
            </CursorButton>
          )}
          {mcpClient === "vscode" && (
            <VSCodeButton href={VSCODE_MCP_INSTALL_URL}>
              Add to VS Code
            </VSCodeButton>
          )}
        </div>
      )}
    </div>
  );
}

// Reusable MCP Setup Steps Component
type McpSetupStepsProps = {
  mcpClient: McpClient;
  setMcpClient: (client: McpClient) => void;
  promptText: string;
  copiedPrompt: boolean;
  onCopyPrompt: () => void;
};

export function McpSetupSteps({
  mcpClient,
  setMcpClient,
  promptText,
  copiedPrompt,
  onCopyPrompt,
}: McpSetupStepsProps) {
  return (
    <div className="flex min-w-0 flex-col gap-6 sm:gap-8">
      {/* Step 1: Add the MCP server */}
      <div className="min-w-0">
        <div className="flex items-start gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary sm:h-8 sm:w-8">
            1
          </div>
          <div className="min-w-0">
            <h4 className="font-medium">Add the MCP server</h4>
            <p className="text-sm text-muted-foreground">
              Add to your coding agent&apos;s MCP config
            </p>
          </div>
        </div>

        <div className="mt-3 min-w-0 sm:mt-4">
          <McpConfigSection mcpClient={mcpClient} setMcpClient={setMcpClient} />
        </div>
      </div>

      {/* Step 2: Prompt your agent */}
      <div className="min-w-0">
        <div className="flex items-start gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary sm:h-8 sm:w-8">
            2
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <span className="min-w-0 break-all font-mono text-xs text-muted-foreground sm:truncate sm:text-sm">
              {promptText}
            </span>
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

        {mcpClient === "cursor" && (
          <div className="mt-3 sm:mt-4">
            <CursorButton href={getCursorPromptDeeplink(promptText)}>
              Prompt Cursor
            </CursorButton>
          </div>
        )}
      </div>
    </div>
  );
}

// Add MCP Dialog Component
type AddMcpDialogProps = {
  trigger?: React.ReactNode;
  children?: React.ReactNode;
};

const DEFAULT_PROMPT =
  'Follow the "Base App Setup" cookbook from fullstackrecipes';

function AddMcpDialogInner({ trigger, children }: AddMcpDialogProps) {
  const [mcpClient, setMcpClient] = useState<McpClient>("cursor");
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [isOpen, setIsOpen] = useQueryState(
    "mcp",
    parseAsBoolean.withDefault(false),
  );

  function handleOpenChange(open: boolean) {
    setIsOpen(open || null);
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(DEFAULT_PROMPT);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    } catch {
      // Silently fail
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="lg" className="gap-2 font-medium">
            <Server className="h-4 w-4" />
            Add MCP Server
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            Add MCP Server
          </DialogTitle>
        </DialogHeader>

        <McpSetupSteps
          mcpClient={mcpClient}
          setMcpClient={setMcpClient}
          promptText={DEFAULT_PROMPT}
          copiedPrompt={copiedPrompt}
          onCopyPrompt={copyPrompt}
        />

        {children}
      </DialogContent>
    </Dialog>
  );
}

export function AddMcpDialog(props: AddMcpDialogProps) {
  return (
    <Suspense
      fallback={
        <Button variant="outline" size="lg" className="gap-2 font-medium">
          <Server className="h-4 w-4" />
          Add MCP Server
        </Button>
      }
    >
      <AddMcpDialogInner {...props} />
    </Suspense>
  );
}
