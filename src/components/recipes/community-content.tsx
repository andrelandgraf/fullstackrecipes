"use client";

import { useState } from "react";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleBookmarkAction } from "@/lib/recipes/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function CommunityRecipeContent({
  recipeId,
  isBookmarked: initialIsBookmarked,
  isAuthenticated,
}: {
  recipeId: string;
  isBookmarked: boolean;
  isAuthenticated: boolean;
}) {
  const [isBookmarked, setIsBookmarked] = useState(initialIsBookmarked);
  const [isToggling, setIsToggling] = useState(false);

  async function handleToggleBookmark() {
    if (!isAuthenticated) {
      toast.error("Sign in to bookmark recipes");
      return;
    }

    setIsToggling(true);
    const result = await toggleBookmarkAction(
      { userRecipeId: recipeId },
      isBookmarked,
    );

    if (result.error) {
      toast.error(result.error);
    } else {
      setIsBookmarked(!isBookmarked);
      toast.success(isBookmarked ? "Removed from library" : "Added to library");
    }
    setIsToggling(false);
  }

  return (
    <Button
      variant={isBookmarked ? "default" : "outline"}
      size="sm"
      className="gap-2"
      onClick={handleToggleBookmark}
      disabled={isToggling}
    >
      <Bookmark
        className={cn("size-4", isBookmarked && "fill-current")}
      />
      {isBookmarked ? "Saved to Library" : "Save to Library"}
    </Button>
  );
}

