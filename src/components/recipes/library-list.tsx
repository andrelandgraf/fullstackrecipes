"use client";

import { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useQueryState, parseAsString } from "nuqs";
import { formatDistanceToNow } from "date-fns";
import {
  BookOpen,
  Search,
  Bookmark,
  User,
  BookMarked,
  Layers,
} from "lucide-react";
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
import { removeBookmarkAction } from "@/lib/recipes/actions";
import { toast } from "sonner";
import type { LibraryItem } from "@/lib/recipes/queries";
import { isCookbook } from "@/lib/recipes/data";
import { cn } from "@/lib/utils";

function LibraryItemCard({
  item,
  onRemove,
}: {
  item: LibraryItem;
  onRemove: (item: LibraryItem) => void;
}) {
  const [isRemoving, setIsRemoving] = useState(false);

  async function handleRemove(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    setIsRemoving(true);
    const target =
      item.type === "built-in"
        ? { builtInSlug: item.item.slug }
        : { userRecipeId: item.item.id };

    const result = await removeBookmarkAction(target);

    if (result.error) {
      toast.error(result.error);
      setIsRemoving(false);
    } else {
      onRemove(item);
      toast.success("Removed from library");
    }
  }

  if (item.type === "built-in") {
    const recipe = item.item;
    const Icon = recipe.icon;
    const isCookbookItem = isCookbook(recipe);

    return (
      <Link href={`/recipes/${recipe.slug}`}>
        <Card className="h-full transition-all hover:ring-2 hover:ring-primary/50">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg truncate">
                      {recipe.title}
                    </CardTitle>
                    {isCookbookItem && (
                      <Badge variant="secondary" className="gap-1 shrink-0">
                        <Layers className="size-3" />
                        Cookbook
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Built-in recipe
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 text-primary"
                onClick={handleRemove}
                disabled={isRemoving}
              >
                <Bookmark className="size-4 fill-current" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="line-clamp-2">
              {recipe.description}
            </CardDescription>
            <div className="flex flex-wrap gap-1 mt-3">
              {recipe.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  }

  // User recipe
  const recipe = item.item;

  return (
    <Link href={`/community/${recipe.id}`}>
      <Card className="h-full transition-all hover:ring-2 hover:ring-primary/50">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                <BookOpen className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg truncate">
                  {recipe.title}
                </CardTitle>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <User className="size-3" />
                  <span>{recipe.userName}</span>
                  <Badge variant="secondary" className="text-xs">
                    Community
                  </Badge>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-primary"
              onClick={handleRemove}
              disabled={isRemoving}
            >
              <Bookmark className="size-4 fill-current" />
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
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function LibraryListInner({ initialItems }: { initialItems: LibraryItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [searchQuery, setSearchQuery] = useQueryState(
    "q",
    parseAsString.withDefault(""),
  );

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const query = searchQuery.toLowerCase();
    return items.filter((item) => {
      if (item.type === "built-in") {
        return (
          item.item.title.toLowerCase().includes(query) ||
          item.item.description.toLowerCase().includes(query) ||
          item.item.tags.some((tag) => tag.toLowerCase().includes(query))
        );
      }
      return (
        item.item.title.toLowerCase().includes(query) ||
        item.item.description?.toLowerCase().includes(query) ||
        item.item.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
    });
  }, [items, searchQuery]);

  function handleRemove(removedItem: LibraryItem) {
    setItems((prev) =>
      prev.filter((item) => {
        if (item.type !== removedItem.type) return true;
        if (item.type === "built-in" && removedItem.type === "built-in") {
          return item.item.slug !== removedItem.item.slug;
        }
        if (item.type === "user-recipe" && removedItem.type === "user-recipe") {
          return item.item.id !== removedItem.item.id;
        }
        return true;
      }),
    );
  }

  function handleSearchChange(value: string) {
    setSearchQuery(value || null);
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <BookMarked className="size-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium">Your library is empty</h3>
        <p className="text-muted-foreground mt-1">
          Bookmark recipes to save them to your library
        </p>
        <div className="flex gap-4 mt-4">
          <Link href="/#recipes">
            <Button variant="outline">Browse Recipes</Button>
          </Link>
          <Link href="/community">
            <Button>Explore Community</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative flex-1 w-full sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search your library..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BookMarked className="size-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">No recipes found</h3>
          <p className="text-muted-foreground mt-1">
            Try a different search term
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => (
            <LibraryItemCard
              key={
                item.type === "built-in"
                  ? `built-in-${item.item.slug}`
                  : `user-${item.item.id}`
              }
              item={item}
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function LibraryList(props: { initialItems: LibraryItem[] }) {
  return (
    <Suspense>
      <LibraryListInner {...props} />
    </Suspense>
  );
}
