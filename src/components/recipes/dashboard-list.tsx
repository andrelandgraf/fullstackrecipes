"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useQueryState, parseAsString } from "nuqs";
import { formatDistanceToNow } from "date-fns";
import {
  BookOpen,
  Search,
  Trash2,
  MoreVertical,
  Pencil,
  Globe,
  Lock,
  Eye,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteRecipeAction } from "@/lib/recipes/actions";
import { toast } from "sonner";
import type { UserRecipe } from "@/lib/recipes/schema";

function RecipeListItem({
  recipe,
  onRequestDelete,
}: {
  recipe: UserRecipe;
  onRequestDelete: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-3 rounded-lg hover:ring-2 hover:ring-primary/50 transition-all">
      <Link
        href={`/dashboard/recipes/${recipe.id}`}
        className="flex items-center gap-3 flex-1 min-w-0"
      >
        <BookOpen className="size-4 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-medium truncate text-sm">
                {recipe.title}
              </span>
              {recipe.isPublic ? (
                <Badge variant="secondary" className="gap-1 shrink-0">
                  <Globe className="size-3" />
                  Public
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 shrink-0">
                  <Lock className="size-3" />
                  Private
                </Badge>
              )}
            </div>
            <span className="text-xs text-muted-foreground shrink-0">
              {formatDistanceToNow(new Date(recipe.updatedAt), {
                addSuffix: true,
              })}
            </span>
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {recipe.description || "No description"}
          </p>
        </div>
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground shrink-0"
          >
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/dashboard/recipes/${recipe.id}`}>
              <Pencil className="size-4 mr-2" />
              Edit
            </Link>
          </DropdownMenuItem>
          {recipe.isPublic && (
            <DropdownMenuItem asChild>
              <Link href={`/community/${recipe.id}`}>
                <Eye className="size-4 mr-2" />
                View Public
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onSelect={() => onRequestDelete(recipe.id)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="size-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function RecipeDashboardList({
  initialRecipes,
}: {
  initialRecipes: UserRecipe[];
}) {
  const [recipes, setRecipes] = useState(initialRecipes);
  const [searchQuery, setSearchQuery] = useQueryState(
    "q",
    parseAsString.withDefault(""),
  );
  const [deleteId, setDeleteId] = useQueryState("delete", parseAsString);
  const [isDeleting, setIsDeleting] = useState(false);

  const recipeToDelete = deleteId
    ? recipes.find((r) => r.id === deleteId)
    : null;

  const filteredRecipes = useMemo(() => {
    if (!searchQuery.trim()) return recipes;
    const query = searchQuery.toLowerCase();
    return recipes.filter(
      (recipe) =>
        recipe.title.toLowerCase().includes(query) ||
        recipe.description?.toLowerCase().includes(query),
    );
  }, [recipes, searchQuery]);

  function handleDelete(id: string) {
    setRecipes((prev) => prev.filter((r) => r.id !== id));
    setDeleteId(null);
  }

  async function handleConfirmDelete() {
    if (!deleteId) return;
    setIsDeleting(true);
    const result = await deleteRecipeAction(deleteId);
    if (result.error) {
      toast.error(result.error);
      setIsDeleting(false);
    } else {
      handleDelete(deleteId);
      toast.success("Recipe deleted");
      setIsDeleting(false);
    }
  }

  function handleSearchChange(value: string) {
    setSearchQuery(value || null);
  }

  if (recipes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <BookOpen className="size-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium">No recipes yet</h3>
        <p className="text-muted-foreground mt-1">
          Create your first recipe to share with the community
        </p>
        <Link href="/dashboard/recipes/new" className="mt-4">
          <Button className="gap-2">Create Recipe</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative flex-1 w-full sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search recipes..."
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
        <div className="border rounded-lg divide-y">
          {filteredRecipes.map((recipe) => (
            <RecipeListItem
              key={recipe.id}
              recipe={recipe}
              onRequestDelete={setDeleteId}
            />
          ))}
        </div>
      )}

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete recipe?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{recipeToDelete?.title}&quot;.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
