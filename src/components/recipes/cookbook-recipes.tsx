"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  BookOpen,
  Database,
  MessageSquare,
  Bot,
  CreditCard,
  Rocket,
  Settings,
  KeyRound,
  Mail,
  Flag,
  Paintbrush,
  Palette,
  Sparkles,
  Layers,
  RefreshCw,
  Circle,
} from "lucide-react";
import { CompactRecipeCard } from "./compact-card";
import type { SerializedRecipe } from "@/lib/recipes/serialize";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const iconMap: Record<string, typeof Database> = {
  Database,
  MessageSquare,
  Bot,
  CreditCard,
  Rocket,
  Settings,
  KeyRound,
  Mail,
  Flag,
  Paintbrush,
  Palette,
  Sparkles,
  Layers,
  RefreshCw,
  BookOpen,
  Circle,
};

interface CookbookRecipesProps {
  recipes: SerializedRecipe[];
}

export function CookbookRecipes({ recipes }: CookbookRecipesProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-3">
      <CollapsibleTrigger className="flex w-full items-center gap-2 text-left">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <BookOpen className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">
            This cookbook includes {recipes.length} recipes
          </p>
          <p className="text-xs text-muted-foreground">
            Click to {isOpen ? "collapse" : "expand"} the recipe list
          </p>
        </div>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          {recipes.map((recipe, index) => (
            <div key={recipe.slug} className="relative">
              <div className="absolute -left-6 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                {index + 1}
              </div>
              <CompactRecipeCard
                title={recipe.title}
                description={recipe.description}
                icon={iconMap[recipe.iconName] ?? Circle}
                slug={recipe.slug}
              />
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
