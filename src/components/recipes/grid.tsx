"use client";

import { useState, useMemo } from "react";
import { RecipeCard } from "@/components/recipes/card";
import { RecipeSearch } from "@/components/recipes/search";
import { getAllItems, isCookbook } from "@/lib/recipes/data";
import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown } from "lucide-react";

const items = getAllItems();

const allTags = Array.from(
  new Set(items.flatMap((r) => r.tags).filter((t) => t !== "Cookbook")),
).sort();

export function RecipeGrid() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortAscending, setSortAscending] = useState(false);
  const [cookbooksOnly, setCookbooksOnly] = useState(false);

  const filteredItems = useMemo(() => {
    const filtered = items.filter((item) => {
      const matchesSearch =
        searchQuery === "" ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.some((tag) => item.tags.includes(tag));

      const matchesCookbookFilter = !cookbooksOnly || isCookbook(item);

      return matchesSearch && matchesTags && matchesCookbookFilter;
    });

    return sortAscending ? filtered : [...filtered].reverse();
  }, [searchQuery, selectedTags, sortAscending, cookbooksOnly]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedTags([]);
    setCookbooksOnly(false);
  };

  return (
    <section id="recipes" className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="mb-2 text-2xl font-bold tracking-tight md:text-3xl">
              All Recipes
            </h2>
            <p className="text-sm text-muted-foreground">
              Browse recipes for single features, or start with a cookbook that
              bundles multiple recipes. Follow recipes in order—from basic setup
              to AI agents—to build a complete app.
            </p>
          </div>
          <Button
            variant={sortAscending ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setSortAscending(!sortAscending)}
            className="gap-2"
            title={
              sortAscending ? "Sorted by setup order" : "Sorted by newest first"
            }
          >
            {sortAscending ? (
              <>
                <ArrowUp className="h-4 w-4" />
                <span className="hidden sm:inline">Setup order</span>
              </>
            ) : (
              <>
                <ArrowDown className="h-4 w-4" />
                <span className="hidden sm:inline">Newest first</span>
              </>
            )}
          </Button>
        </div>

        <RecipeSearch
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          allTags={allTags}
          selectedTags={selectedTags}
          onTagToggle={toggleTag}
          onClearFilters={clearFilters}
          resultCount={filteredItems.length}
          totalCount={items.length}
          cookbooksOnly={cookbooksOnly}
          onCookbooksOnlyChange={setCookbooksOnly}
        />

        {filteredItems.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2">
            {filteredItems.map((item) => (
              <RecipeCard
                key={item.slug}
                {...item}
                isCookbook={isCookbook(item)}
                recipeCount={isCookbook(item) ? item.recipes.length : undefined}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
            <p className="mb-2 text-muted-foreground">
              No recipes match your filters
            </p>
            <button
              onClick={clearFilters}
              className="text-sm text-primary hover:underline"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
