"use client";

import { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useQueryState, parseAsString } from "nuqs";
import { formatDistanceToNow } from "date-fns";
import { BookOpen, Search, Bookmark, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toggleBookmarkAction } from "@/lib/recipes/actions";
import { toast } from "sonner";
import type { UserRecipe } from "@/lib/recipes/schema";
import { cn } from "@/lib/utils";

type CommunityRecipe = UserRecipe & { userName: string };

function CommunityRecipeCard({
  recipe,
  isBookmarked,
  isAuthenticated,
  onToggleBookmark,
}: {
  recipe: CommunityRecipe;
  isBookmarked: boolean;
  isAuthenticated: boolean;
  onToggleBookmark: (id: string, isBookmarked: boolean) => void;
}) {
  const [isToggling, setIsToggling] = useState(false);

  async function handleToggleBookmark(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast.error("Sign in to bookmark recipes");
      return;
    }

    setIsToggling(true);
    const result = await toggleBookmarkAction(
      { userRecipeId: recipe.id },
      isBookmarked,
    );

    if (result.error) {
      toast.error(result.error);
    } else {
      onToggleBookmark(recipe.id, !isBookmarked);
      toast.success(isBookmarked ? "Removed from library" : "Added to library");
    }
    setIsToggling(false);
  }

  return (
    <Link href={`/community/${recipe.id}`}>
      <Card className="h-full transition-all hover:ring-2 hover:ring-primary/50">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg truncate">{recipe.title}</CardTitle>
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <User className="size-3" />
                <span>{recipe.userName}</span>
                <span>·</span>
                <span>
                  {formatDistanceToNow(new Date(recipe.createdAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className={cn("shrink-0", isBookmarked && "text-primary")}
              onClick={handleToggleBookmark}
              disabled={isToggling}
            >
              <Bookmark
                className={cn("size-4", isBookmarked && "fill-current")}
              />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <CardDescription className="line-clamp-2">
            {recipe.description || "No description"}
          </CardDescription>
          {recipe.tags && recipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {recipe.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {recipe.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{recipe.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function CommunityRecipeGridInner({
  initialRecipes,
  bookmarkedIds,
  isAuthenticated,
}: {
  initialRecipes: CommunityRecipe[];
  bookmarkedIds: Set<string>;
  isAuthenticated: boolean;
}) {
  const [bookmarks, setBookmarks] = useState(bookmarkedIds);
  const [searchQuery, setSearchQuery] = useQueryState(
    "q",
    parseAsString.withDefault(""),
  );

  const filteredRecipes = useMemo(() => {
    if (!searchQuery.trim()) return initialRecipes;
    const query = searchQuery.toLowerCase();
    return initialRecipes.filter(
      (recipe) =>
        recipe.title.toLowerCase().includes(query) ||
        recipe.description?.toLowerCase().includes(query) ||
        recipe.userName.toLowerCase().includes(query) ||
        recipe.tags?.some((tag) => tag.toLowerCase().includes(query)),
    );
  }, [initialRecipes, searchQuery]);

  function handleToggleBookmark(id: string, isNowBookmarked: boolean) {
    setBookmarks((prev) => {
      const next = new Set(prev);
      if (isNowBookmarked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  function handleSearchChange(value: string) {
    setSearchQuery(value || null);
  }

  if (initialRecipes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <BookOpen className="size-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium">No community recipes yet</h3>
        <p className="text-muted-foreground mt-1">
          Be the first to share a recipe with the community
        </p>
        {isAuthenticated && (
          <Link href="/dashboard/recipes/new" className="mt-4">
            <Button className="gap-2">Share a Recipe</Button>
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative flex-1 w-full sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search community recipes..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {filteredRecipes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen className="size-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">No recipes found</h3>
          <p className="text-muted-foreground mt-1">
            Try a different search term
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRecipes.map((recipe) => (
            <CommunityRecipeCard
              key={recipe.id}
              recipe={recipe}
              isBookmarked={bookmarks.has(recipe.id)}
              isAuthenticated={isAuthenticated}
              onToggleBookmark={handleToggleBookmark}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CommunityRecipeGrid(props: {
  initialRecipes: CommunityRecipe[];
  bookmarkedIds: Set<string>;
  isAuthenticated: boolean;
}) {
  return (
    <Suspense>
      <CommunityRecipeGridInner {...props} />
    </Suspense>
  );
}
