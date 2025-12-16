"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Copy,
  Check,
  Terminal,
  Server,
  FileCode,
  FileText,
  ArrowRight,
  Bot,
  BookOpen,
  ScrollText,
} from "lucide-react";
import Image from "next/image";
import {
  getAllItems,
  getAllCookbooks,
  getAllRecipes,
  getItemPromptText,
  getCursorPromptDeeplink,
  isCookbook,
} from "@/lib/recipes/data";
import { codeToHtml, type BundledLanguage } from "shiki";
import { CodeBlockClient } from "@/components/docs/code-block-client";

type CodeBlockProps = {
  code: string;
  language: BundledLanguage;
  filePath?: string;
};

function getFileExtension(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase();
  return ext ?? "file";
}

function useHighlightedCode(code: string, language: BundledLanguage) {
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

function CodeBlock({ code, language, filePath }: CodeBlockProps) {
  const html = useHighlightedCode(code, language);

  if (!html) {
    return (
      <div className="rounded-md border bg-background p-4">
        <pre className="overflow-x-auto font-mono text-sm">
          <code>{code}</code>
        </pre>
      </div>
    );
  }

  return (
    <CodeBlockClient
      filePath={filePath ?? null}
      fileExt={filePath ? getFileExtension(filePath) : null}
      language={language}
      code={code}
      lightHtml={html.light}
      darkHtml={html.dark}
      hasFilePath={!!filePath}
    />
  );
}

// Simple inline code highlighting for previews (no container/header)
function InlineHighlightedCode({
  code,
  language,
}: {
  code: string;
  language: BundledLanguage;
}) {
  const html = useHighlightedCode(code, language);

  if (!html) {
    return (
      <pre className="overflow-x-auto font-mono text-sm">
        <code>{code}</code>
      </pre>
    );
  }

  return (
    <div className="min-w-0 w-full overflow-hidden">
      <div
        className="overflow-x-auto dark:hidden [&>pre]:m-0 [&>pre]:bg-transparent! [&>pre]:p-0 [&>pre]:text-sm [&_code]:font-mono [&_code]:text-sm"
        dangerouslySetInnerHTML={{ __html: html.light }}
      />
      <div
        className="hidden overflow-x-auto dark:block [&>pre]:m-0 [&>pre]:bg-transparent! [&>pre]:p-0 [&>pre]:text-sm [&_code]:font-mono [&_code]:text-sm"
        dangerouslySetInnerHTML={{ __html: html.dark }}
      />
    </div>
  );
}

const items = getAllItems();
const cookbooks = getAllCookbooks();
const recipes = getAllRecipes();

const MCP_CONFIG = `{
  "mcpServers": {
    "fullstackrecipes": {
      "url": "https://fullstackrecipes.com/api/mcp"
    }
  }
}`;

const CURSOR_MCP_INSTALL_URL =
  "https://cursor.com/en-US/install-mcp?name=fullstackrecipes&config=eyJ1cmwiOiJodHRwczovL2Z1bGxzdGFja3JlY2lwZXMuY29tL2FwaS9tY3AifQ%3D%3D";

const CLAUDE_CODE_MCP_COMMAND =
  "claude mcp add --transport http fullstackrecipes https://fullstackrecipes.com/api/mcp";

const VSCODE_MCP_CONFIG = `{
  "servers": {
    "fullstackrecipes": {
      "type": "http",
      "url": "https://fullstackrecipes.com/api/mcp"
    }
  }
}`;

const VSCODE_MCP_INSTALL_URL = `vscode:mcp/install?${encodeURIComponent(
  JSON.stringify({
    fullstackrecipes: {
      type: "http",
      url: "https://fullstackrecipes.com/api/mcp",
    },
  }),
)}`;

function getRegistryCommand(registryDep: string) {
  return `bunx shadcn@latest add https://fullstackrecipes.com/r/${registryDep}.json`;
}

function CursorButton({ href, children }: { href: string; children: string }) {
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

function VSCodeButton({ href, children }: { href: string; children: string }) {
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

export function HowItWorks() {
  const [selectedSlug, setSelectedSlug] = useState(items[0].slug);
  const [recipeContent, setRecipeContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [copiedState, setCopiedState] = useState<string | null>(null);
  const [mcpClient, setMcpClient] = useState<
    "cursor" | "claude-code" | "vscode"
  >("cursor");

  const selectedItem = items.find((r) => r.slug === selectedSlug)!;
  const hasRegistry =
    selectedItem.registryDeps && selectedItem.registryDeps.length > 0;
  const Icon = selectedItem.icon;

  useEffect(() => {
    async function loadContent() {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/recipes/${selectedSlug}`);
        const data = await response.json();
        setRecipeContent(data.content);
      } catch {
        setRecipeContent("Failed to load recipe content");
      } finally {
        setIsLoading(false);
      }
    }
    loadContent();
  }, [selectedSlug]);

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedState(key);
      setTimeout(() => setCopiedState(null), 2000);
    } catch {
      // Silently fail
    }
  };

  return (
    <section className="border-b border-border/50 py-24">
      <div className="mx-auto max-w-6xl px-6">
        {/* Section Header */}
        <div className="mx-auto mb-16 max-w-2xl text-center">
          {/* Visual: Recipe → AI flow */}
          <div className="mb-6 flex items-center justify-center gap-3">
            <div className="relative">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-card shadow-sm">
                <FileText className="h-7 w-7 text-primary" />
              </div>
              <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                md
              </div>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground/50">
              <div className="h-px w-6 bg-gradient-to-r from-border to-muted-foreground/30" />
              <ArrowRight className="h-4 w-4" />
              <div className="h-px w-6 bg-gradient-to-l from-border to-muted-foreground/30" />
            </div>
            <div className="relative">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 shadow-sm shadow-primary/10">
                <Bot className="h-7 w-7 text-primary" />
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/40" />
                <span className="relative inline-flex h-4 w-4 rounded-full bg-primary" />
              </span>
            </div>
          </div>

          <h2 className="mb-4 text-3xl font-bold tracking-tight">
            How It Works
          </h2>
          <p className="text-muted-foreground">
            Each recipe is a complete, step-by-step guide for adding a feature
            or integration to your app—ready to copy and paste into your AI
            coding assistant.
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-8 lg:grid-cols-[1fr,1.2fr]">
          {/* Left: Recipe Preview */}
          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  isCookbook(selectedItem) ? "bg-primary/10" : "bg-secondary"
                }`}
              >
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <Select value={selectedSlug} onValueChange={setSelectedSlug}>
                  <SelectTrigger className="h-auto border-none bg-transparent p-0 shadow-none focus:ring-0">
                    <span className="font-mono text-sm font-semibold">
                      <SelectValue />
                    </span>
                  </SelectTrigger>
                  <SelectContent className="w-[320px] sm:max-h-96">
                    {/* Cookbooks group */}
                    <div className="px-2 py-1.5">
                      <div className="flex items-center gap-2 text-xs font-medium text-primary">
                        <BookOpen className="h-3.5 w-3.5" />
                        Cookbooks
                      </div>
                      <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
                        Curated bundles of multiple recipes
                      </p>
                    </div>
                    {cookbooks.map((item) => (
                      <SelectItem key={item.slug} value={item.slug}>
                        {item.title}
                      </SelectItem>
                    ))}

                    {/* Separator */}
                    <div className="my-1 border-t border-border/50" />

                    {/* Recipes group */}
                    <div className="px-2 py-1.5">
                      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                        <ScrollText className="h-3.5 w-3.5" />
                        Recipes
                      </div>
                      <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
                        Focused guides for specific features
                      </p>
                    </div>
                    {recipes.map((item) => (
                      <SelectItem key={item.slug} value={item.slug}>
                        {item.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Select a guide to preview
                </p>
              </div>
            </div>

            <Card className="relative min-w-0 overflow-hidden border-border/50 bg-card/50 p-0">
              {/* Recipe Preview Header */}
              <div className="flex items-center justify-between border-b border-border/50 bg-secondary/30 px-4 py-2">
                <div className="flex items-center gap-2">
                  <FileCode className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono text-xs text-muted-foreground">
                    {selectedSlug}.md
                  </span>
                </div>
              </div>

              {/* Recipe Preview Content */}
              <div className="h-[420px] min-w-0 overflow-y-auto overflow-x-hidden p-4">
                {isLoading ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : (
                  <div className="min-w-0 overflow-hidden text-xs leading-relaxed [&>pre]:whitespace-pre-wrap [&_code]:text-xs">
                    <InlineHighlightedCode
                      code={recipeContent}
                      language="markdown"
                    />
                  </div>
                )}
              </div>

              {/* Fade overlay */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card to-transparent" />
            </Card>
          </div>

          {/* Right: Methods */}
          <div className="flex min-w-0 flex-col">
            <Tabs defaultValue="copy" className="w-full">
              <TabsList className="mb-6 w-full">
                <TabsTrigger value="copy" className="flex-1 gap-2">
                  <Copy className="h-4 w-4" />
                  <span className="hidden sm:inline">Copy Markdown</span>
                  <span className="sm:hidden">Copy</span>
                </TabsTrigger>
                <TabsTrigger value="mcp" className="flex-1 gap-2">
                  <Server className="h-4 w-4" />
                  <span className="hidden sm:inline">MCP Server</span>
                  <span className="sm:hidden">MCP</span>
                </TabsTrigger>
                {hasRegistry && (
                  <TabsTrigger value="registry" className="flex-1 gap-2">
                    <Terminal className="h-4 w-4" />
                    <span className="hidden sm:inline">Registry</span>
                    <span className="sm:hidden">CLI</span>
                  </TabsTrigger>
                )}
              </TabsList>

              {/* Copy Markdown Tab */}
              <TabsContent value="copy" className="mt-0">
                <Card className="flex flex-col gap-8 border-border/50 p-6">
                  {/* Step 1 */}
                  <div>
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        1
                      </div>
                      <div>
                        <h4 className="font-medium">Copy recipe as Markdown</h4>
                        <p className="text-sm text-muted-foreground">
                          Each recipe page has a &quot;Copy as Markdown&quot;
                          button
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-lg border border-dashed border-border bg-secondary/30 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <span className="truncate font-mono text-sm text-muted-foreground">
                          {selectedSlug}.md
                        </span>
                        <Button
                          size="sm"
                          variant={
                            copiedState === "markdown" ? "secondary" : "default"
                          }
                          onClick={() =>
                            copyToClipboard(recipeContent, "markdown")
                          }
                          className="shrink-0 gap-2"
                          disabled={isLoading}
                        >
                          {copiedState === "markdown" ? (
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

                  {/* Step 2 */}
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      2
                    </div>
                    <div>
                      <h4 className="font-medium">
                        Paste to your AI assistant
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Ask your coding agent (Cursor, Claude, Copilot, etc.) to
                        follow the recipe and implement it in your project.
                      </p>
                    </div>
                  </div>
                </Card>
              </TabsContent>

              {/* MCP Server Tab */}
              <TabsContent value="mcp" className="mt-0">
                <Card className="flex flex-col gap-8 border-border/50 p-6">
                  {/* Step 1: Add the MCP server */}
                  <div>
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        1
                      </div>
                      <div>
                        <h4 className="font-medium">Add the MCP server</h4>
                        <p className="text-sm text-muted-foreground">
                          Add to your coding agent&apos;s MCP config
                        </p>
                      </div>
                    </div>

                    {/* MCP Client Tabs */}
                    <div className="mt-4 flex gap-1 rounded-lg border border-border bg-secondary/30 p-1">
                      <button
                        onClick={() => setMcpClient("cursor")}
                        className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                          mcpClient === "cursor"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Cursor
                      </button>
                      <button
                        onClick={() => setMcpClient("vscode")}
                        className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                          mcpClient === "vscode"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        VS Code
                      </button>
                      <button
                        onClick={() => setMcpClient("claude-code")}
                        className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                          mcpClient === "claude-code"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Claude Code
                      </button>
                    </div>

                    {mcpClient === "cursor" && (
                      <CodeBlock
                        code={MCP_CONFIG}
                        language="json"
                        filePath=".cursor/mcp.json"
                      />
                    )}
                    {mcpClient === "vscode" && (
                      <CodeBlock
                        code={VSCODE_MCP_CONFIG}
                        language="json"
                        filePath=".vscode/mcp.json"
                      />
                    )}
                    {mcpClient === "claude-code" && (
                      <CodeBlock
                        code={CLAUDE_CODE_MCP_COMMAND}
                        language="bash"
                      />
                    )}

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

                  {/* Step 2: Ask your coding agent */}
                  <div>
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        2
                      </div>
                      <div>
                        <h4 className="font-medium">
                          Ask your coding agent to follow the recipe
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          The agent can fetch recipes directly via MCP resources
                        </p>
                      </div>
                    </div>

                    <CodeBlock
                      code={getItemPromptText(selectedItem)}
                      language="bash"
                    />

                    {mcpClient === "cursor" && (
                      <CursorButton
                        href={getCursorPromptDeeplink(
                          getItemPromptText(selectedItem),
                        )}
                      >
                        Prompt Cursor
                      </CursorButton>
                    )}
                  </div>
                </Card>
              </TabsContent>

              {/* Registry Tab */}
              {hasRegistry && (
                <TabsContent value="registry" className="mt-0">
                  <Card className="flex flex-col gap-8 border-border/50 p-6">
                    {/* Step 1 */}
                    <div>
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                          1
                        </div>
                        <div>
                          <h4 className="font-medium">
                            Install via shadcn registry
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            This recipe has reusable code you can install
                            directly
                          </p>
                        </div>
                      </div>

                      {selectedItem.registryDeps?.map((dep) => (
                        <CodeBlock
                          key={dep}
                          code={getRegistryCommand(dep)}
                          language="bash"
                        />
                      ))}
                    </div>

                    {/* Step 2 */}
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        2
                      </div>
                      <div>
                        <h4 className="font-medium">
                          Code is added to your project
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          The files are installed to your project. Update
                          imports to match your project structure.
                        </p>
                      </div>
                    </div>
                  </Card>
                </TabsContent>
              )}
            </Tabs>
          </div>
        </div>
      </div>
    </section>
  );
}
