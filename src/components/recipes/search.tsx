"use client";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

const tagDescriptions: Record<string, string> = {
  Cookbooks: "Bundle of setup instructions and skills",
  "Setup Instructions": "Resource for adding a feature or pattern",
  Skills: "Workflow instructions for using a feature or pattern",
};

interface RecipeSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  allTags: string[];
  selectedTags: string[];
  onTagToggle: (tag: string) => void;
  onClearFilters: () => void;
  resultCount: number;
  totalCount: number;
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
}: RecipeSearchProps) {
  const hasActiveFilters = searchQuery !== "" || selectedTags.length > 0;

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

      {/* Tag filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Filter by:</span>
        {allTags.map((tag) => {
          const description = tagDescriptions[tag];
          const badge = (
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
          );

          if (description) {
            return (
              <Tooltip key={tag}>
                <TooltipTrigger asChild>{badge}</TooltipTrigger>
                <TooltipContent>{description}</TooltipContent>
              </Tooltip>
            );
          }

          return badge;
        })}
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
