"use client";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Search, X, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecipeSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  allTags: string[];
  selectedTags: string[];
  onTagToggle: (tag: string) => void;
  onClearFilters: () => void;
  resultCount: number;
  totalCount: number;
  cookbooksOnly: boolean;
  onCookbooksOnlyChange: (value: boolean) => void;
}

export function RecipeSearch({
  searchQuery,
  onSearchChange,
  allTags,
  selectedTags,
  onTagToggle,
  onClearFilters,
  resultCount,
  totalCount,
  cookbooksOnly,
  onCookbooksOnlyChange,
}: RecipeSearchProps) {
  const hasActiveFilters =
    searchQuery !== "" || selectedTags.length > 0 || cookbooksOnly;

  return (
    <div className="mb-8 space-y-4">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search recipes..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 bg-secondary/50 border-border/50 focus:border-primary"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Tag filters */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Filter by:</span>
          {allTags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              onClick={() => onTagToggle(tag)}
              className={cn(
                "cursor-pointer transition-colors",
                selectedTags.includes(tag)
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground",
              )}
            >
              {tag}
              {selectedTags.includes(tag) && <X className="ml-1 h-3 w-3" />}
            </Badge>
          ))}
        </div>

        {/* Cookbooks only toggle */}
        <div className="flex items-center gap-2">
          <Switch
            id="cookbooks-only"
            checked={cookbooksOnly}
            onCheckedChange={onCookbooksOnlyChange}
          />
          <Label
            htmlFor="cookbooks-only"
            className="flex cursor-pointer items-center gap-1.5 text-sm text-muted-foreground"
          >
            <BookOpen className="h-3.5 w-3.5" />
            Cookbooks only
          </Label>
        </div>
      </div>

      {/* Results count and clear */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Showing {resultCount} of {totalCount} recipes
          </span>
          <button
            onClick={onClearFilters}
            className="text-primary hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
