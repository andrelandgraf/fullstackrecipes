"use client";

import { useState, useMemo } from "react";
import { RecipeCard } from "@/components/recipes/card";
import { RecipeSearch } from "@/components/recipes/search";
import { getAllRecipes } from "@/lib/recipes/data";
import { Button } from "@/components/ui/button";
import { ListOrdered } from "lucide-react";

const recipes = getAllRecipes();

const allTags = Array.from(new Set(recipes.flatMap((r) => r.tags))).sort();

export function RecipeGrid() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [inOrder, setInOrder] = useState(false);

  const filteredRecipes = useMemo(() => {
    const filtered = recipes.filter((recipe) => {
      const matchesSearch =
        searchQuery === "" ||
        recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recipe.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.some((tag) => recipe.tags.includes(tag));

      return matchesSearch && matchesTags;
    });

    return inOrder ? filtered : [...filtered].reverse();
  }, [searchQuery, selectedTags, inOrder]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedTags([]);
  };

  return (
    <section id="recipes" className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="mb-2 text-2xl font-bold tracking-tight md:text-3xl">
              All Recipes
            </h2>
            <p className="text-muted-foreground">
              Step-by-step guides to ship faster
            </p>
          </div>
          <Button
            variant={inOrder ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setInOrder(!inOrder)}
            className="gap-2"
          >
            <ListOrdered className="h-4 w-4" />
            In order
          </Button>
        </div>

        <RecipeSearch
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          allTags={allTags}
          selectedTags={selectedTags}
          onTagToggle={toggleTag}
          onClearFilters={clearFilters}
          resultCount={filteredRecipes.length}
          totalCount={recipes.length}
        />

        {filteredRecipes.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2">
            {filteredRecipes.map((recipe) => (
              <RecipeCard key={recipe.title} {...recipe} />
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
