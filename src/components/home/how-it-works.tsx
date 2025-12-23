"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useQueryState, parseAsBoolean } from "nuqs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Plus,
  X,
} from "lucide-react";
import {
  getAllItems,
  isCookbook,
  type Recipe,
  type Cookbook,
} from "@/lib/recipes/data";
import type { BundledLanguage } from "shiki";
import {
  useHighlightedCode,
  McpCodeBlock,
  McpSetupSteps,
  type McpClient,
} from "@/components/mcp/config";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useSelection } from "@/lib/recipes/selection-context";

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

function getRegistryCommand(registryDeps: string[]) {
  const urls = registryDeps
    .map((dep) => `https://fullstackrecipes.com/r/${dep}.json`)
    .join(" ");
  return `bunx shadcn@latest add ${urls}`;
}

function HowItWorksInner() {
  const {
    selectedSlugs,
    selectedItems,
    allContentSlugs,
    promptText,
    registryDeps,
    hasRegistry,
    removeItem,
    deliveryTab,
    setDeliveryTab,
  } = useSelection();

  // Extract cookbook slugs for Claude Code plugin commands
  const selectedCookbookSlugs = useMemo(
    () => selectedItems.filter(isCookbook).map((item) => item.slug),
    [selectedItems],
  );

  const [recipeContents, setRecipeContents] = useState<
    Record<string, string | null>
  >({});
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>(
    {},
  );
  const [copiedState, setCopiedState] = useState<string | null>(null);
  const [mcpClient, setMcpClient] = useState<McpClient>("cursor");
  const [useContext7, setUseContext7] = useState(false);
  const [, setPickerOpen] = useQueryState(
    "picker",
    parseAsBoolean.withDefault(false),
  );

  // Load content for all selected items
  useEffect(() => {
    async function loadContent(slug: string) {
      if (recipeContents[slug] !== undefined) return;

      setLoadingStates((prev) => ({ ...prev, [slug]: true }));
      try {
        const response = await fetch(`/api/recipes/${slug}`);
        const data = await response.json();
        setRecipeContents((prev) => ({ ...prev, [slug]: data.content }));
      } catch {
        setRecipeContents((prev) => ({
          ...prev,
          [slug]: "Failed to load content",
        }));
      } finally {
        setLoadingStates((prev) => ({ ...prev, [slug]: false }));
      }
    }

    for (const slug of allContentSlugs) {
      loadContent(slug);
    }
  }, [allContentSlugs, recipeContents]);

  const isLoading = allContentSlugs.some((slug) => loadingStates[slug]);

  // Combine all content for copying
  const combinedContent = useMemo(() => {
    return allContentSlugs
      .map((slug) => recipeContents[slug])
      .filter((content): content is string => content !== null)
      .join("\n\n---\n\n");
  }, [allContentSlugs, recipeContents]);

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedState(key);
      setTimeout(() => setCopiedState(null), 2000);
    } catch {
      // Silently fail
    }
  };

  // Display content for preview - show first selected item's content
  const previewSlug = selectedSlugs[0];
  const previewContent = previewSlug ? recipeContents[previewSlug] : null;
  const previewLoading = previewSlug ? loadingStates[previewSlug] : false;

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
            <i>
              Follow recipes step by step—or let's be real, paste the markdown
              into your coding agent. Even better: use our MCP server or Claude
              Code plugins to access recipes directly.
            </i>
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-8 lg:grid-cols-[1fr,1.2fr]">
          {/* Left: Recipe Preview */}
          <div className="flex min-w-0 flex-col gap-4">
            {/* Selection display */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Selected guides
                </span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {selectedItems.length} selected
                </span>
              </div>

              {/* Selected items tags */}
              <div className="flex flex-wrap gap-2">
                {selectedItems.map((item) => {
                  const Icon = item.icon;
                  const cookbook = isCookbook(item);
                  return (
                    <Badge
                      key={item.slug}
                      variant="secondary"
                      className={cn(
                        "gap-1.5 py-1.5 pl-2 pr-1",
                        cookbook
                          ? "border border-primary/30 bg-primary/10"
                          : "bg-secondary",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="max-w-[140px] truncate text-xs font-medium">
                        {item.title}
                      </span>
                      {cookbook && (
                        <span className="rounded bg-primary/20 px-1 py-0.5 text-[10px] text-primary">
                          {(item as Cookbook).recipes.length}
                        </span>
                      )}
                      <button
                        onClick={() => removeItem(item.slug)}
                        className="ml-0.5 rounded p-0.5 transition-colors hover:bg-destructive/20 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPickerOpen(true)}
                  className="h-7 gap-1 px-2 text-xs"
                >
                  <Plus className="h-3 w-3" />
                  Add
                </Button>
              </div>
            </div>

            <Card className="relative min-w-0 overflow-hidden border-border/50 bg-card/50 p-0">
              {/* Recipe Preview Header */}
              <div className="flex items-center justify-between border-b border-border/50 bg-secondary/30 px-4 py-2">
                <div className="flex items-center gap-2">
                  <FileCode className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono text-xs text-muted-foreground">
                    {previewSlug ? `${previewSlug}.md` : "Select a guide..."}
                    {allContentSlugs.length > 1 && (
                      <span className="ml-1 text-primary">
                        +{allContentSlugs.length - 1} more
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* Recipe Preview Content */}
              <div className="h-[420px] min-w-0 overflow-y-auto overflow-x-hidden p-4">
                {selectedItems.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <BookOpen className="mb-3 h-10 w-10 text-muted-foreground/50" />
                    <p className="mb-2 font-medium text-muted-foreground">
                      No guides selected
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPickerOpen(true)}
                    >
                      Browse guides
                    </Button>
                  </div>
                ) : previewLoading ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : (
                  <div className="min-w-0 overflow-hidden text-xs leading-relaxed [&>pre]:whitespace-pre-wrap [&_code]:text-xs">
                    {previewContent && (
                      <InlineHighlightedCode
                        code={previewContent}
                        language="markdown"
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Fade overlay */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card to-transparent" />
            </Card>
          </div>

          {/* Right: Methods */}
          <div className="flex min-w-0 flex-col">
            <Tabs
              value={deliveryTab}
              onValueChange={(v) => setDeliveryTab(v as typeof deliveryTab)}
            >
              <TabsList>
                <TabsTrigger value="copy">
                  <Copy className="h-4 w-4" />
                  <span className="hidden sm:inline">Copy Markdown</span>
                  <span className="sm:hidden">Copy</span>
                </TabsTrigger>
                <TabsTrigger value="mcp">
                  <Server className="h-4 w-4" />
                  <span className="hidden sm:inline">Add MCP / Plugin</span>
                  <span className="sm:hidden">MCP</span>
                </TabsTrigger>
                {hasRegistry && (
                  <TabsTrigger value="registry">
                    <Terminal className="h-4 w-4" />
                    <span className="hidden sm:inline">Registry</span>
                    <span className="sm:hidden">CLI</span>
                  </TabsTrigger>
                )}
              </TabsList>

              {/* Copy Markdown Tab */}
              <TabsContent value="copy">
                <Card className="flex flex-col gap-8 rounded-t-none border-t-0 border-border/50 p-6">
                  {/* Step 1 */}
                  <div>
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        1
                      </div>
                      <div>
                        <h4 className="font-medium">
                          Copy{" "}
                          {allContentSlugs.length > 1 ? "recipes" : "recipe"} as
                          Markdown
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {allContentSlugs.length > 1
                            ? `All ${allContentSlugs.length} guides will be combined into one prompt`
                            : 'Each recipe page has a "Copy as Markdown" button'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-lg border border-dashed border-border bg-secondary/30 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <span className="truncate font-mono text-sm text-muted-foreground">
                          {allContentSlugs.length === 1
                            ? `${previewSlug}.md`
                            : `${allContentSlugs.length} guides combined`}
                        </span>
                        <Button
                          size="sm"
                          variant={
                            copiedState === "markdown" ? "secondary" : "default"
                          }
                          onClick={() =>
                            copyToClipboard(combinedContent, "markdown")
                          }
                          className="shrink-0 gap-2"
                          disabled={isLoading || selectedItems.length === 0}
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
              <TabsContent value="mcp">
                <Card className="rounded-t-none border-t-0 border-border/50 p-6">
                  <McpSetupSteps
                    mcpClient={mcpClient}
                    setMcpClient={setMcpClient}
                    useContext7={useContext7}
                    setUseContext7={setUseContext7}
                    promptText={promptText}
                    copiedPrompt={copiedState === "prompt"}
                    onCopyPrompt={() => {
                      const prompt = useContext7
                        ? `${promptText} using Context7`
                        : promptText;
                      copyToClipboard(prompt, "prompt");
                    }}
                    selectedCookbookSlugs={selectedCookbookSlugs}
                  />
                </Card>
              </TabsContent>

              {/* Registry Tab */}
              {hasRegistry && (
                <TabsContent value="registry">
                  <Card className="flex flex-col gap-8 rounded-t-none border-t-0 border-border/50 p-6">
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
                            {registryDeps.length > 1
                              ? `${registryDeps.length} registry items from selected guides`
                              : "This recipe has reusable code you can install directly"}
                          </p>
                        </div>
                      </div>

                      <McpCodeBlock
                        code={getRegistryCommand(registryDeps)}
                        language="bash"
                      />
                    </div>

                    {/* Step 2 */}
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        2
                      </div>
                      <div>
                        <h4 className="font-medium">Follow the recipe</h4>
                        <p className="text-sm text-muted-foreground">
                          Learn how to use the utilities in your project and
                          adapt them to your needs.
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

export function HowItWorks() {
  return (
    <Suspense fallback={<HowItWorksFallback />}>
      <HowItWorksInner />
    </Suspense>
  );
}

function HowItWorksFallback() {
  return (
    <section className="border-b border-border/50 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <div className="mb-6 flex items-center justify-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-card shadow-sm">
              <FileText className="h-7 w-7 text-primary" />
            </div>
            <div className="flex items-center gap-1 text-muted-foreground/50">
              <div className="h-px w-6 bg-gradient-to-r from-border to-muted-foreground/30" />
              <ArrowRight className="h-4 w-4" />
              <div className="h-px w-6 bg-gradient-to-l from-border to-muted-foreground/30" />
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 shadow-sm shadow-primary/10">
              <Bot className="h-7 w-7 text-primary" />
            </div>
          </div>
          <h2 className="mb-4 text-3xl font-bold tracking-tight">
            How It Works
          </h2>
          <p className="text-muted-foreground">
            <i>
              Follow recipes step by step—or let's be real, paste the markdown
              into your coding agent. Even better: use our MCP server or Claude
              Code plugins to access recipes directly.
            </i>
          </p>
        </div>
        <div className="h-96 animate-pulse rounded-lg bg-secondary/50" />
      </div>
    </section>
  );
}
