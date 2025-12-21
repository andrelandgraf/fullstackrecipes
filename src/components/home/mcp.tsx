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
import { Download, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCursorPromptDeeplink } from "@/lib/recipes/data";

// Direct MCP Configuration Constants
export const MCP_CONFIG = `{
  "mcpServers": {
    "fullstackrecipes": {
      "url": "https://fullstackrecipes.com/api/mcp"
    }
  }
}`;

export const CURSOR_MCP_INSTALL_URL =
  "https://cursor.com/en-US/install-mcp?name=fullstackrecipes&config=eyJ1cmwiOiJodHRwczovL2Z1bGxzdGFja3JlY2lwZXMuY29tL2FwaS9tY3AifQ%3D%3D";

export const CLAUDE_CODE_PLUGIN_COMMANDS = `/plugin marketplace add andrelandgraf/fullstackrecipes
/plugin install fullstackrecipes@fullstackrecipes`;

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

// Context7 MCP Configuration Constants
export const CONTEXT7_MCP_CONFIG = `{
  "mcpServers": {
    "context7": {
      "url": "https://mcp.context7.com/mcp"
    }
  }
}`;

export const CONTEXT7_CURSOR_MCP_INSTALL_URL =
  "https://cursor.com/en-US/install-mcp?name=context7&config=eyJ1cmwiOiJodHRwczovL21jcC5jb250ZXh0Ny5jb20vbWNwIn0%3D";

export const CONTEXT7_CLAUDE_CODE_COMMAND =
  "claude mcp add --transport http context7 https://mcp.context7.com/mcp";

export const CONTEXT7_VSCODE_MCP_CONFIG = `{
  "servers": {
    "context7": {
      "type": "http",
      "url": "https://mcp.context7.com/mcp"
    }
  }
}`;

export const CONTEXT7_VSCODE_MCP_INSTALL_URL = `vscode:mcp/install?${encodeURIComponent(
  JSON.stringify({
    context7: {
      type: "http",
      url: "https://mcp.context7.com/mcp",
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

function getMcpTabs(useContext7: boolean) {
  return [
    {
      id: "cursor" as const,
      label: "Cursor",
      code: useContext7 ? CONTEXT7_MCP_CONFIG : MCP_CONFIG,
      language: "json" as const,
      filePath: ".cursor/mcp.json",
    },
    {
      id: "vscode" as const,
      label: "VS Code",
      code: useContext7 ? CONTEXT7_VSCODE_MCP_CONFIG : VSCODE_MCP_CONFIG,
      language: "json" as const,
      filePath: ".vscode/mcp.json",
    },
    {
      id: "claude-code" as const,
      label: "Claude Code",
      code: useContext7
        ? CONTEXT7_CLAUDE_CODE_COMMAND
        : CLAUDE_CODE_PLUGIN_COMMANDS,
      language: "bash" as const,
    },
  ];
}

// Reusable MCP Config Section Component
type McpConfigSectionProps = {
  mcpClient: McpClient;
  setMcpClient: (client: McpClient) => void;
  useContext7: boolean;
  setUseContext7: (value: boolean) => void;
  showAddButtons?: boolean;
};

export function McpConfigSection({
  mcpClient,
  setMcpClient,
  useContext7,
  setUseContext7,
  showAddButtons = true,
}: McpConfigSectionProps) {
  const tabs = getMcpTabs(useContext7);
  const cursorInstallUrl = useContext7
    ? CONTEXT7_CURSOR_MCP_INSTALL_URL
    : CURSOR_MCP_INSTALL_URL;
  const vscodeInstallUrl = useContext7
    ? CONTEXT7_VSCODE_MCP_INSTALL_URL
    : VSCODE_MCP_INSTALL_URL;

  return (
    <div className="flex min-w-0 flex-col overflow-hidden">
      {/* Context7 Toggle */}
      <label className="mb-3 flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
        <span>Using Context7?</span>
        <input
          type="checkbox"
          checked={useContext7}
          onChange={(e) => setUseContext7(e.target.checked)}
          className="h-4 w-4 cursor-pointer rounded border-border accent-primary"
        />
      </label>

      <TabbedCodeBlock
        tabs={tabs}
        activeTab={mcpClient}
        onTabChange={(tabId) => setMcpClient(tabId as McpClient)}
      />

      {/* Add Buttons */}
      {showAddButtons && (
        <div className="mt-3 sm:mt-4">
          {mcpClient === "cursor" && (
            <CursorButton href={cursorInstallUrl}>Add to Cursor</CursorButton>
          )}
          {mcpClient === "vscode" && (
            <VSCodeButton href={vscodeInstallUrl}>Add to VS Code</VSCodeButton>
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
  useContext7: boolean;
  setUseContext7: (value: boolean) => void;
  promptText: string;
  copiedPrompt: boolean;
  onCopyPrompt: () => void;
};

export function McpSetupSteps({
  mcpClient,
  setMcpClient,
  useContext7,
  setUseContext7,
  promptText,
  copiedPrompt,
  onCopyPrompt,
}: McpSetupStepsProps) {
  // Append "using Context7" to prompt when Context7 is enabled
  const displayPrompt = useContext7
    ? `${promptText} using Context7`
    : promptText;

  return (
    <div className="flex min-w-0 flex-col gap-6 sm:gap-8">
      {/* Step 1: Add the MCP server or plugin */}
      <div className="min-w-0">
        <div className="flex items-start gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary sm:h-8 sm:w-8">
            1
          </div>
          <div className="min-w-0">
            <h4 className="font-medium">
              {mcpClient === "claude-code" && !useContext7
                ? "Install fullstackrecipes plugin"
                : useContext7
                  ? "Add Context7 MCP server"
                  : "Add fullstackrecipes MCP server"}
            </h4>
            <p className="text-sm text-muted-foreground">
              {mcpClient === "claude-code" && !useContext7
                ? "Plugin includes MCP server, skills, and project rules"
                : "Add to your coding agent's MCP config"}
            </p>
          </div>
        </div>

        <div className="mt-3 min-w-0 sm:mt-4">
          <McpConfigSection
            mcpClient={mcpClient}
            setMcpClient={setMcpClient}
            useContext7={useContext7}
            setUseContext7={setUseContext7}
          />
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
              {useContext7
                ? "The agent can fetch recipes directly via the Context7 docs search"
                : "The agent can fetch recipes directly via MCP resources"}
            </p>
          </div>
        </div>

        <div className="mt-3 min-w-0 rounded-lg border border-dashed border-border bg-secondary/30 p-3 sm:mt-4 sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0 flex-1 overflow-x-auto">
              <span className="whitespace-nowrap font-mono text-xs text-muted-foreground sm:text-sm">
                {displayPrompt}
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

        {mcpClient === "cursor" && (
          <div className="mt-3 sm:mt-4">
            <CursorButton href={getCursorPromptDeeplink(displayPrompt)}>
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
  const [useContext7, setUseContext7] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [isOpen, setIsOpen] = useQueryState(
    "mcp",
    parseAsBoolean.withDefault(false),
  );

  function handleOpenChange(open: boolean) {
    setIsOpen(open || null);
  }

  const fullPrompt = useContext7
    ? `${DEFAULT_PROMPT} using Context7`
    : DEFAULT_PROMPT;

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(fullPrompt);
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
            <Download className="h-4 w-4" />
            Add to Agent
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl lg:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Add to Agent
          </DialogTitle>
        </DialogHeader>

        <McpSetupSteps
          mcpClient={mcpClient}
          setMcpClient={setMcpClient}
          useContext7={useContext7}
          setUseContext7={setUseContext7}
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
          <Download className="h-4 w-4" />
          Add to Agent
        </Button>
      }
    >
      <AddMcpDialogInner {...props} />
    </Suspense>
  );
}
