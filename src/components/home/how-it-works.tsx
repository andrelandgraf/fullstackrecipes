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
  ExternalLink,
} from "lucide-react";
import {
  getAllItems,
  getItemPromptText,
  getCursorPromptDeeplink,
} from "@/lib/recipes/data";
import { codeToHtml, type BundledLanguage } from "shiki";

type HighlightedCodeProps = {
  code: string;
  language: BundledLanguage;
};

function HighlightedCode({ code, language }: HighlightedCodeProps) {
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

const MCP_CONFIG = `{
  "mcpServers": {
    "fullstackrecipes": {
      "url": "https://fullstackrecipes.com/api/mcp"
    }
  }
}`;

function getRegistryCommand(registryDep: string) {
  return `bunx shadcn@latest add https://fullstackrecipes.com/r/${registryDep}.json`;
}

export function HowItWorks() {
  const [selectedSlug, setSelectedSlug] = useState(items[0].slug);
  const [recipeContent, setRecipeContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [copiedState, setCopiedState] = useState<string | null>(null);

  const selectedItem = items.find((r) => r.slug === selectedSlug)!;
  const hasRegistry =
    selectedItem.registryDeps && selectedItem.registryDeps.length > 0;

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

  const Icon = selectedItem.icon;

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
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <Select value={selectedSlug} onValueChange={setSelectedSlug}>
                  <SelectTrigger className="h-auto border-none bg-transparent p-0 shadow-none focus:ring-0">
                    <span className="font-mono text-sm font-semibold">
                      <SelectValue />
                    </span>
                  </SelectTrigger>
                  <SelectContent className="sm:max-h-80">
                    {items.map((item) => (
                      <SelectItem key={item.slug} value={item.slug}>
                        {item.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Select a recipe to preview
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
                    <HighlightedCode code={recipeContent} language="markdown" />
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
                <Card className="border-border/50 p-6">
                  <div className="mb-4 flex items-start gap-3">
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

                  <div className="mb-6 rounded-lg border border-dashed border-border bg-secondary/30 p-4">
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
                <Card className="border-border/50 p-6">
                  <div className="mb-4 flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      1
                    </div>
                    <div>
                      <h4 className="font-medium">Add the MCP server</h4>
                      <p className="text-sm text-muted-foreground">
                        Add to your coding agent's MCP config (Cursor, Claude
                        Code, or VS Code MCP config)
                      </p>
                    </div>
                  </div>

                  <div className="group relative mb-6 min-w-0 overflow-hidden rounded-lg border border-border bg-background p-4">
                    <HighlightedCode code={MCP_CONFIG} language="json" />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => copyToClipboard(MCP_CONFIG, "mcp")}
                      className="absolute right-2 top-2 h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      {copiedState === "mcp" ? (
                        <Check className="h-4 w-4 text-primary" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  <div className="mb-4 flex items-start gap-3">
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

                  <div className="group relative min-w-0 overflow-hidden rounded-lg border border-border bg-background p-4">
                    <HighlightedCode
                      code={getItemPromptText(selectedItem)}
                      language="bash"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        copyToClipboard(
                          getItemPromptText(selectedItem),
                          "prompt",
                        )
                      }
                      className="absolute right-2 top-2 h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      {copiedState === "prompt" ? (
                        <Check className="h-4 w-4 text-primary" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <Button asChild variant="outline" className="gap-2">
                      <a
                        href={getCursorPromptDeeplink(
                          getItemPromptText(selectedItem),
                        )}
                      >
                        <ExternalLink className="h-4 w-4" />
                        Prompt Cursor
                      </a>
                    </Button>
                  </div>
                </Card>
              </TabsContent>

              {/* Registry Tab */}
              {hasRegistry && (
                <TabsContent value="registry" className="mt-0">
                  <Card className="border-border/50 p-6">
                    <div className="mb-4 flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        1
                      </div>
                      <div>
                        <h4 className="font-medium">
                          Install via shadcn registry
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          This recipe has reusable code you can install directly
                        </p>
                      </div>
                    </div>

                    {selectedItem.registryDeps?.map((dep, index) => (
                      <div
                        key={dep}
                        className="group relative mb-4 min-w-0 overflow-hidden rounded-lg border border-border bg-background p-4"
                      >
                        <HighlightedCode
                          code={getRegistryCommand(dep)}
                          language="bash"
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() =>
                            copyToClipboard(
                              getRegistryCommand(dep),
                              `registry-${index}`,
                            )
                          }
                          className="absolute right-2 top-2 h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          {copiedState === `registry-${index}` ? (
                            <Check className="h-4 w-4 text-primary" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    ))}

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
