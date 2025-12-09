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
}

export function RelatedRecipes({ requiredItems }: RelatedRecipesProps) {
  if (requiredItems.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-3 text-sm text-muted-foreground">
          This recipe requires you to complete:
        </p>
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
    </div>
  );
}
