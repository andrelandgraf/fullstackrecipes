"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Search,
  X,
  BookOpen,
  ScrollText,
  Check,
  ChevronRight,
} from "lucide-react";
import type { Recipe, Cookbook } from "@/lib/recipes/data";

interface ContentPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: (Recipe | Cookbook)[];
  selectedSlugs: string[];
  onSelectionChange: (slugs: string[]) => void;
  isCookbook: (item: Recipe | Cookbook) => item is Cookbook;
}

export function ContentPicker({
  open,
  onOpenChange,
  items,
  selectedSlugs,
  onSelectionChange,
  isCookbook,
}: ContentPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(
    null,
  );

  const allTags = useMemo(
    () => Array.from(new Set(items.flatMap((item) => item.tags))).sort(),
    [items],
  );

  const cookbooks = useMemo(
    () => items.filter((item): item is Cookbook => isCookbook(item)),
    [items, isCookbook],
  );

  const recipes = useMemo(
    () => items.filter((item): item is Recipe => !isCookbook(item)),
    [items, isCookbook],
  );

  // Get all recipe slugs that are included in selected cookbooks
  const recipesIncludedInSelectedCookbooks = useMemo(() => {
    const includedRecipes = new Set<string>();
    for (const slug of selectedSlugs) {
      const item = items.find((i) => i.slug === slug);
      if (item && isCookbook(item)) {
        for (const recipeSlug of item.recipes) {
          includedRecipes.add(recipeSlug);
        }
      }
    }
    return includedRecipes;
  }, [selectedSlugs, items, isCookbook]);

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

  const toggleItem = (slug: string) => {
    const item = items.find((i) => i.slug === slug);
    if (!item) return;

    // If it's a recipe that's included in a selected cookbook, don't allow toggle
    if (!isCookbook(item) && recipesIncludedInSelectedCookbooks.has(slug)) {
      return;
    }

    if (selectedSlugs.includes(slug)) {
      // Deselect
      onSelectionChange(selectedSlugs.filter((s) => s !== slug));
    } else {
      // Select - if selecting a cookbook, remove any individually selected recipes that are in it
      if (isCookbook(item)) {
        const newSelection = selectedSlugs.filter(
          (s) => !item.recipes.includes(s),
        );
        onSelectionChange([...newSelection, slug]);
      } else {
        onSelectionChange([...selectedSlugs, slug]);
      }
    }
  };

  const clearSelection = () => {
    onSelectionChange([]);
  };

  const handleDone = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] w-full max-w-4xl flex-col gap-0 overflow-hidden p-0 lg:max-w-5xl xl:max-w-6xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Select Recipes & Cookbooks</DialogTitle>
          <DialogDescription>
            Choose one or more recipes and cookbooks to preview
          </DialogDescription>
        </DialogHeader>

        {/* Header with search and filters */}
        <div className="border-b border-border/50 p-4">
          <div className="mb-4 flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search recipes and cookbooks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-border/50 bg-secondary/50 pl-10 focus:border-primary"
                autoFocus
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
                  setSelectedTagFilter(tag === selectedTagFilter ? null : tag)
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
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="p-4">
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
                            isSelected ? "bg-primary/20" : "bg-primary/10",
                          )}
                        >
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-mono text-sm font-semibold group-hover:text-primary">
                              {item.title}
                            </span>
                            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                              {item.recipes.length} recipes
                            </span>
                          </div>
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
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
                      recipesIncludedInSelectedCookbooks.has(item.slug);
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

            {filteredCookbooks.length === 0 && filteredRecipes.length === 0 && (
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

        {/* Footer with selection summary and actions */}
        <div className="flex items-center justify-between border-t border-border/50 bg-secondary/30 px-4 py-3">
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
          <Button onClick={handleDone} size="sm">
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface SelectedItemsDisplayProps {
  items: (Recipe | Cookbook)[];
  selectedSlugs: string[];
  onRemove: (slug: string) => void;
  onOpenPicker: () => void;
  isCookbook: (item: Recipe | Cookbook) => item is Cookbook;
}

export function SelectedItemsDisplay({
  items,
  selectedSlugs,
  onRemove,
  onOpenPicker,
  isCookbook,
}: SelectedItemsDisplayProps) {
  const selectedItems = selectedSlugs
    .map((slug) => items.find((i) => i.slug === slug))
    .filter((item): item is Recipe | Cookbook => item !== undefined);

  if (selectedItems.length === 0) {
    return (
      <button
        onClick={onOpenPicker}
        className="flex w-full items-center gap-2 rounded-lg border border-dashed border-border/50 p-3 text-left transition-colors hover:border-primary/50 hover:bg-secondary/30"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
          <Search className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <span className="font-mono text-sm font-medium">
            Select recipes...
          </span>
          <p className="text-xs text-muted-foreground">
            Click to browse and select
          </p>
        </div>
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {selectedItems.map((item) => {
          const Icon = item.icon;
          const cookbook = isCookbook(item);
          return (
            <Badge
              key={item.slug}
              variant="secondary"
              className={cn(
                "gap-1.5 py-1 pl-2 pr-1",
                cookbook ? "border border-primary/30 bg-primary/10" : "",
              )}
            >
              <Icon className="h-3 w-3" />
              <span className="max-w-[120px] truncate text-xs">
                {item.title}
              </span>
              {cookbook && (
                <span className="text-[10px] text-muted-foreground">
                  ({(item as Cookbook).recipes.length})
                </span>
              )}
              <button
                onClick={() => onRemove(item.slug)}
                className="ml-0.5 rounded p-0.5 hover:bg-secondary"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          );
        })}
      </div>
      <button
        onClick={onOpenPicker}
        className="text-sm text-primary hover:underline"
      >
        + Add more
      </button>
    </div>
  );
}
