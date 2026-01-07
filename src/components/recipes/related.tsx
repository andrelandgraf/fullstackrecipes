"use client";

import {
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
  ListChecks,
} from "lucide-react";
import { CompactRecipeCard } from "./compact-card";
import type { SerializedItem } from "@/lib/recipes/serialize";

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

interface RelatedRecipesProps {
  requiredItems: SerializedItem[];
  isCookbook: boolean;
}

export function RelatedRecipes({
  requiredItems,
  isCookbook,
}: RelatedRecipesProps) {
  if (requiredItems.length === 0) {
    return null;
  }

  const label = isCookbook ? "cookbook" : "recipe";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <ListChecks className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">
            This {label} requires you to complete {requiredItems.length}{" "}
            {requiredItems.length === 1 ? "recipe" : "recipes"}
          </p>
          <p className="text-xs text-muted-foreground">
            Complete these prerequisites first
          </p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {requiredItems.map((item) => (
          <CompactRecipeCard
            key={item.slug}
            title={item.title}
            description={item.description}
            icon={iconMap[item.iconName] ?? Circle}
            slug={item.slug}
          />
        ))}
      </div>
    </div>
  );
}
