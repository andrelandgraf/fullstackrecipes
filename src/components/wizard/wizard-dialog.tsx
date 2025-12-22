"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useQueryState, parseAsBoolean } from "nuqs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Download,
  ArrowLeft,
  ArrowRight,
  Search,
  X,
  BookOpen,
  ScrollText,
  Check,
  ChevronRight,
  Copy,
  Server,
  Terminal,
  Loader2,
} from "lucide-react";
import {
  useSelection,
  type DeliveryTab,
} from "@/lib/recipes/selection-context";
import {
  McpSetupSteps,
  McpCodeBlock,
  type McpClient,
} from "@/components/mcp/config";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  getAllItems,
  isCookbook,
  type Recipe,
  type Cookbook,
} from "@/lib/recipes/data";

const items = getAllItems();
const allTags = Array.from(new Set(items.flatMap((item) => item.tags))).sort();

function getRegistryCommand(registryDeps: string[]) {
  const urls = registryDeps
    .map((dep) => `https://fullstackrecipes.com/r/${dep}.json`)
    .join(" ");
  return `bunx shadcn@latest add ${urls}`;
}

type WizardStep = "recipes" | "agent";

type WizardDialogMode = "full" | "recipes-only" | "agent-only";

type WizardDialogProps = {
  /** Dialog mode: "full" shows wizard, "recipes-only" only recipe selection, "agent-only" only MCP options */
  mode?: WizardDialogMode;
  /** Initial step to show (only used when mode is "full") */
  initialStep?: WizardStep;
  /** Query param name for open state */
  queryParam?: string;
  /** Custom trigger element */
  trigger?: React.ReactNode;
  /** Whether to show the default trigger button */
  showTrigger?: boolean;
  /** Callback when dialog closes */
  onClose?: () => void;
  /** Override slugs to set when dialog opens (resets previous selections) */
  overrideSlugs?: string[];
};

function WizardDialogInner({
  mode = "full",
  initialStep,
  queryParam = "wizard",
  trigger,
  showTrigger = true,
  onClose,
  overrideSlugs,
}: WizardDialogProps) {
  const getDefaultStep = (): WizardStep => {
    if (mode === "agent-only") return "agent";
    if (initialStep) return initialStep;
    return "recipes";
  };

  const [isOpen, setIsOpen] = useQueryState(
    queryParam,
    parseAsBoolean.withDefault(false),
  );
  const [step, setStep] = useState<WizardStep>(getDefaultStep());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(
    null,
  );
  const [mcpClient, setMcpClient] = useState<McpClient>("cursor");
  const [useContext7, setUseContext7] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [recipeContents, setRecipeContents] = useState<
    Record<string, string | null>
  >({});
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>(
    {},
  );

  const {
    selectedSlugs,
    selectedItems,
    allContentSlugs,
    promptText,
    registryDeps,
    hasRegistry,
    recipesIncludedInCookbooks,
    deliveryTab,
    toggleItem,
    removeItem,
    clearSelection,
    setDeliveryTab,
    setSelectedSlugs,
  } = useSelection();

  // Extract cookbook slugs for Claude Code plugin commands
  const selectedCookbookSlugs = useMemo(
    () => selectedItems.filter(isCookbook).map((item) => item.slug),
    [selectedItems],
  );

  // Load content for all selected items when on agent step
  useEffect(() => {
    if (step !== "agent" || deliveryTab !== "copy") return;

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
  }, [step, deliveryTab, allContentSlugs, recipeContents]);

  const isLoadingMarkdown = allContentSlugs.some((slug) => loadingStates[slug]);

  // Combine all content for copying
  const combinedContent = useMemo(() => {
    return allContentSlugs
      .map((slug) => recipeContents[slug])
      .filter((content): content is string => content !== null)
      .join("\n\n---\n\n");
  }, [allContentSlugs, recipeContents]);

  // Override selection when dialog opens with overrideSlugs
  useEffect(() => {
    if (isOpen && overrideSlugs) {
      setSelectedSlugs(overrideSlugs);
    }
  }, [isOpen, overrideSlugs, setSelectedSlugs]);

  // Reset step when dialog closes or mode changes
  useEffect(() => {
    if (!isOpen) {
      setStep(getDefaultStep());
    }
  }, [isOpen, mode, initialStep]);

  function handleOpenChange(open: boolean) {
    setIsOpen(open || null);
    if (!open) {
      onClose?.();
    }
  }

  const cookbooks = useMemo(
    () => items.filter((item): item is Cookbook => isCookbook(item)),
    [],
  );

  const recipes = useMemo(
    () => items.filter((item): item is Recipe => !isCookbook(item)),
    [],
  );

  const filteredCookbooks = useMemo(() => {
    return cookbooks.filter((item) => {
      const matchesSearch =
        searchQuery === "" ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTag =
        !selectedTagFilter || item.tags.includes(selectedTagFilter);
      return matchesSearch && matchesTag;
    });
  }, [cookbooks, searchQuery, selectedTagFilter]);

  const filteredRecipes = useMemo(() => {
    return recipes.filter((item) => {
      const matchesSearch =
        searchQuery === "" ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTag =
        !selectedTagFilter || item.tags.includes(selectedTagFilter);
      return matchesSearch && matchesTag;
    });
  }, [recipes, searchQuery, selectedTagFilter]);

  const fullPrompt = useContext7 ? `${promptText} using Context7` : promptText;

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(fullPrompt);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    } catch {
      // Silently fail
    }
  }

  async function copyMarkdown() {
    try {
      await navigator.clipboard.writeText(combinedContent);
      setCopiedMarkdown(true);
      setTimeout(() => setCopiedMarkdown(false), 2000);
    } catch {
      // Silently fail
    }
  }

  const isMobile = useIsMobile();
  const showNavigation = mode === "full";
  const isRecipesStep = step === "recipes";
  const isAgentStep = step === "agent";

  return (
    <>
      {showTrigger && (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
          {trigger ?? (
            <Button
              variant="outline"
              size="lg"
              className="gap-2 font-medium"
              onClick={() => setIsOpen(true)}
            >
              <Download className="h-4 w-4" />
              Add to Agent
            </Button>
          )}
        </Dialog>
      )}

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="flex h-[100dvh] w-full max-w-none flex-col gap-0 overflow-hidden rounded-none p-0 sm:h-auto sm:max-h-[90vh] sm:max-w-4xl sm:rounded-lg lg:max-w-5xl xl:max-w-6xl">
          <DialogHeader className="sr-only">
            <DialogTitle>
              {mode === "recipes-only"
                ? "Select Recipes & Cookbooks"
                : mode === "agent-only"
                  ? "Add to Agent"
                  : isRecipesStep
                    ? "Select Recipes & Cookbooks"
                    : "Add to Agent"}
            </DialogTitle>
            <DialogDescription>
              {mode === "recipes-only"
                ? "Choose one or more recipes and cookbooks"
                : mode === "agent-only"
                  ? "Configure how to add fullstackrecipes to your agent"
                  : "Select recipes and configure your agent"}
            </DialogDescription>
          </DialogHeader>

          {/* Step indicator for full wizard */}
          {showNavigation && (
            <div className="flex items-center justify-center gap-2 border-b border-border/50 bg-secondary/30 px-4 py-3">
              <button
                onClick={() => setStep("recipes")}
                className={cn(
                  "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  isRecipesStep
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-current/20 text-xs">
                  1
                </span>
                Select Recipes
              </button>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <button
                onClick={() => setStep("agent")}
                className={cn(
                  "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  isAgentStep
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-current/20 text-xs">
                  2
                </span>
                Add to Agent
              </button>
            </div>
          )}

          {/* Recipe Selection Step */}
          {(mode === "recipes-only" || (mode === "full" && isRecipesStep)) && (
            <>
              {/* Header with search and filters */}
              <div className="border-b border-border/50 px-3 py-4 sm:p-4">
                <div className="mb-4 flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search recipes and cookbooks..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="border-border/50 bg-secondary/50 pl-10 focus:border-primary"
                      autoFocus={!isMobile}
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Tag filters */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">Filter:</span>
                  <Badge
                    variant="secondary"
                    onClick={() => setSelectedTagFilter(null)}
                    className={cn(
                      "cursor-pointer text-xs transition-colors",
                      !selectedTagFilter
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground",
                    )}
                  >
                    All
                  </Badge>
                  {allTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      onClick={() =>
                        setSelectedTagFilter(
                          tag === selectedTagFilter ? null : tag,
                        )
                      }
                      className={cn(
                        "cursor-pointer text-xs transition-colors",
                        selectedTagFilter === tag
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground",
                      )}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Content grid */}
              <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
                <div className="min-w-0 px-3 py-3 sm:p-4">
                  {/* Cookbooks section */}
                  {filteredCookbooks.length > 0 && (
                    <div className="mb-6">
                      <div className="mb-3 flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-semibold text-primary">
                          Cookbooks
                        </h3>
                        <span className="text-xs text-muted-foreground">
                          Curated bundles of recipes
                        </span>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {filteredCookbooks.map((item) => {
                          const isSelected = selectedSlugs.includes(item.slug);
                          const Icon = item.icon;
                          return (
                            <button
                              key={item.slug}
                              onClick={() => toggleItem(item.slug)}
                              className={cn(
                                "group flex items-start gap-3 rounded-lg border p-3 text-left transition-all",
                                isSelected
                                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                                  : "border-border/50 bg-card hover:border-primary/50 hover:bg-secondary/50",
                              )}
                            >
                              <div
                                className={cn(
                                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                                  isSelected
                                    ? "bg-primary/20"
                                    : "bg-primary/10",
                                )}
                              >
                                <Icon className="h-5 w-5 text-primary" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                  <span className="font-mono text-sm font-semibold group-hover:text-primary">
                                    {item.title}
                                  </span>
                                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                                    {item.recipes.length} recipes
                                  </span>
                                </div>
                                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                  {item.description}
                                </p>
                              </div>
                              <div
                                className={cn(
                                  "flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
                                  isSelected
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border bg-background",
                                )}
                              >
                                {isSelected && <Check className="h-3 w-3" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Recipes section */}
                  {filteredRecipes.length > 0 && (
                    <div>
                      <div className="mb-3 flex items-center gap-2">
                        <ScrollText className="h-4 w-4 text-muted-foreground" />
                        <h3 className="text-sm font-semibold text-muted-foreground">
                          Recipes
                        </h3>
                        <span className="text-xs text-muted-foreground">
                          Focused guides for specific features
                        </span>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredRecipes.map((item) => {
                          const isSelected = selectedSlugs.includes(item.slug);
                          const isIncludedInCookbook =
                            recipesIncludedInCookbooks.has(item.slug);
                          const Icon = item.icon;
                          return (
                            <button
                              key={item.slug}
                              onClick={() => toggleItem(item.slug)}
                              disabled={isIncludedInCookbook}
                              className={cn(
                                "group flex items-start gap-3 rounded-lg border p-3 text-left transition-all",
                                isIncludedInCookbook
                                  ? "cursor-default border-primary/30 bg-primary/5 opacity-75"
                                  : isSelected
                                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                                    : "border-border/50 bg-card hover:border-primary/50 hover:bg-secondary/50",
                              )}
                            >
                              <div
                                className={cn(
                                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                                  isSelected || isIncludedInCookbook
                                    ? "bg-primary/20"
                                    : "bg-secondary",
                                )}
                              >
                                <Icon className="h-4 w-4 text-primary" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <span
                                  className={cn(
                                    "block truncate font-mono text-sm font-medium",
                                    !isIncludedInCookbook &&
                                      "group-hover:text-primary",
                                  )}
                                >
                                  {item.title}
                                </span>
                                <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                                  {item.description}
                                </p>
                                {isIncludedInCookbook && (
                                  <p className="mt-1 flex items-center gap-1 text-[10px] text-primary">
                                    <ChevronRight className="h-3 w-3" />
                                    Included in selected cookbook
                                  </p>
                                )}
                              </div>
                              <div
                                className={cn(
                                  "flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
                                  isIncludedInCookbook
                                    ? "border-primary/50 bg-primary/50 text-primary-foreground"
                                    : isSelected
                                      ? "border-primary bg-primary text-primary-foreground"
                                      : "border-border bg-background",
                                )}
                              >
                                {(isSelected || isIncludedInCookbook) && (
                                  <Check className="h-3 w-3" />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {filteredCookbooks.length === 0 &&
                    filteredRecipes.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <p className="text-muted-foreground">
                          No recipes match your search
                        </p>
                        <button
                          onClick={() => {
                            setSearchQuery("");
                            setSelectedTagFilter(null);
                          }}
                          className="mt-2 text-sm text-primary hover:underline"
                        >
                          Clear filters
                        </button>
                      </div>
                    )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-border/50 bg-secondary/30 px-3 py-3 sm:px-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {selectedSlugs.length === 0 ? (
                      "No items selected"
                    ) : (
                      <>
                        <span className="font-medium text-foreground">
                          {selectedSlugs.length}
                        </span>{" "}
                        item{selectedSlugs.length !== 1 ? "s" : ""} selected
                      </>
                    )}
                  </span>
                  {selectedSlugs.length > 0 && (
                    <button
                      onClick={clearSelection}
                      className="text-sm text-primary hover:underline"
                    >
                      Clear all
                    </button>
                  )}
                </div>
                {mode === "recipes-only" ? (
                  <Button onClick={() => handleOpenChange(false)} size="sm">
                    Done
                  </Button>
                ) : (
                  <Button
                    onClick={() => setStep("agent")}
                    size="sm"
                    disabled={selectedSlugs.length === 0}
                    className="gap-2"
                  >
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </>
          )}

          {/* Agent Configuration Step */}
          {(mode === "agent-only" || (mode === "full" && isAgentStep)) && (
            <>
              <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-0 py-3 sm:p-6">
                {/* Selected items summary */}
                {mode === "full" && selectedItems.length > 0 && (
                  <div className="mb-6 px-4 sm:px-0">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        Selected guides
                      </span>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {selectedItems.length} selected
                      </span>
                    </div>
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
                    </div>
                  </div>
                )}

                <div className="overflow-hidden border-y border-border/50 sm:mx-0 sm:rounded-lg sm:border-x">
                  <Tabs
                    value={deliveryTab}
                    onValueChange={(v) => setDeliveryTab(v as DeliveryTab)}
                  >
                    <TabsList className="rounded-none border-0">
                      <TabsTrigger value="copy">
                        <Copy className="h-4 w-4" />
                        <span className="hidden sm:inline">Copy Markdown</span>
                        <span className="sm:hidden">Copy</span>
                      </TabsTrigger>
                      <TabsTrigger value="mcp">
                        <Server className="h-4 w-4" />
                        <span className="hidden sm:inline">
                          Add MCP / Plugin
                        </span>
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
                      <div className="flex flex-col gap-6 border-t border-border/50 bg-card p-4 sm:gap-8 sm:p-6">
                        <div>
                          <div className="flex items-start gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                              1
                            </div>
                            <div>
                              <h4 className="font-medium">
                                Copy{" "}
                                {allContentSlugs.length > 1
                                  ? "recipes"
                                  : "recipe"}{" "}
                                as Markdown
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
                                  ? `${allContentSlugs[0]}.md`
                                  : `${allContentSlugs.length} guides combined`}
                              </span>
                              <Button
                                size="sm"
                                variant={
                                  copiedMarkdown ? "secondary" : "default"
                                }
                                onClick={copyMarkdown}
                                className="shrink-0 gap-2"
                                disabled={
                                  isLoadingMarkdown ||
                                  selectedItems.length === 0
                                }
                              >
                                {isLoadingMarkdown ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Loading
                                  </>
                                ) : copiedMarkdown ? (
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
                        <div className="flex items-start gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                            2
                          </div>
                          <div>
                            <h4 className="font-medium">
                              Paste to your AI assistant
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              Ask your coding agent (Cursor, Claude, Copilot,
                              etc.) to follow the recipe and implement it in
                              your project.
                            </p>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    {/* MCP Server Tab */}
                    <TabsContent value="mcp">
                      <div className="border-t border-border/50 bg-card p-4 sm:p-6">
                        <McpSetupSteps
                          mcpClient={mcpClient}
                          setMcpClient={setMcpClient}
                          useContext7={useContext7}
                          setUseContext7={setUseContext7}
                          promptText={promptText}
                          copiedPrompt={copiedPrompt}
                          onCopyPrompt={copyPrompt}
                          selectedCookbookSlugs={selectedCookbookSlugs}
                        />
                      </div>
                    </TabsContent>

                    {/* Registry Tab */}
                    {hasRegistry && (
                      <TabsContent value="registry">
                        <div className="flex flex-col gap-6 border-t border-border/50 bg-card p-4 sm:gap-8 sm:p-6">
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
                            <div className="mt-4">
                              <McpCodeBlock
                                code={getRegistryCommand(registryDeps)}
                                language="bash"
                              />
                            </div>
                          </div>
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
                        </div>
                      </TabsContent>
                    )}
                  </Tabs>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-border/50 bg-secondary/30 px-3 py-3 sm:px-4">
                {mode === "full" ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep("recipes")}
                    className="gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                ) : (
                  <div />
                )}
                <Button onClick={() => handleOpenChange(false)} size="sm">
                  Done
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function WizardDialog(props: WizardDialogProps) {
  return (
    <Suspense
      fallback={
        props.showTrigger !== false && !props.trigger ? (
          <Button variant="outline" size="lg" className="gap-2 font-medium">
            <Download className="h-4 w-4" />
            Add to Agent
          </Button>
        ) : null
      }
    >
      <WizardDialogInner {...props} />
    </Suspense>
  );
}

// Trigger component for external use
type WizardTriggerProps = {
  children: React.ReactNode;
  queryParam?: string;
};

export function WizardTriggerClient({
  children,
  queryParam = "wizard",
}: WizardTriggerProps) {
  const [, setIsOpen] = useQueryState(
    queryParam,
    parseAsBoolean.withDefault(false),
  );

  return (
    <span onClick={() => setIsOpen(true)} className="cursor-pointer">
      {children}
    </span>
  );
}
