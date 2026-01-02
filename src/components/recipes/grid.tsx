"use client";

import { useMemo, useState, Suspense } from "react";
import {
  useQueryState,
  parseAsBoolean,
  parseAsArrayOf,
  parseAsString,
} from "nuqs";
import { RecipeCard } from "@/components/recipes/card";
import { RecipeSearch } from "@/components/recipes/search";
import { getAllItems, isCookbook } from "@/lib/recipes/data";
import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown } from "lucide-react";

const items = getAllItems();

const allTags = Array.from(new Set(items.flatMap((r) => r.tags))).sort();

type RecipeGridProps = {
  bookmarkedSlugs?: Set<string>;
  isAuthenticated?: boolean;
};

function RecipeGridInner({
  bookmarkedSlugs = new Set(),
  isAuthenticated = false,
}: RecipeGridProps) {
  const [bookmarks, setBookmarks] = useState(bookmarkedSlugs);
  const [searchQuery, setSearchQuery] = useQueryState(
    "q",
    parseAsString.withDefault(""),
  );
  const [selectedTags, setSelectedTags] = useQueryState(
    "tags",
    parseAsArrayOf(parseAsString).withDefault([]),
  );
  const [sortAscending, setSortAscending] = useQueryState(
    "asc",
    parseAsBoolean.withDefault(false),
  );

  const filteredItems = useMemo(() => {
    const filtered = items.filter((item) => {
      const matchesSearch =
        searchQuery === "" ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.some((tag) => item.tags.includes(tag));

      return matchesSearch && matchesTags;
    });

    return sortAscending ? filtered : [...filtered].reverse();
  }, [searchQuery, selectedTags, sortAscending]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const clearFilters = () => {
    setSearchQuery(null);
    setSelectedTags(null);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query || null);
  };

  function handleBookmarkChange(slug: string, isNowBookmarked: boolean) {
    setBookmarks((prev) => {
      const next = new Set(prev);
      if (isNowBookmarked) {
        next.add(slug);
      } else {
        next.delete(slug);
      }
      return next;
    });
  }

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
          onSearchChange={handleSearchChange}
          allTags={allTags}
          selectedTags={selectedTags}
          onTagToggle={toggleTag}
          onClearFilters={clearFilters}
          resultCount={filteredItems.length}
          totalCount={items.length}
        />

        {filteredItems.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2">
            {filteredItems.map((item) => (
              <RecipeCard
                key={item.slug}
                {...item}
                isCookbook={isCookbook(item)}
                recipeCount={isCookbook(item) ? item.recipes.length : undefined}
                isBookmarked={bookmarks.has(item.slug)}
                isAuthenticated={isAuthenticated}
                onBookmarkChange={handleBookmarkChange}
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

export function RecipeGrid(props: RecipeGridProps) {
  return (
    <Suspense>
      <RecipeGridInner {...props} />
    </Suspense>
  );
}
