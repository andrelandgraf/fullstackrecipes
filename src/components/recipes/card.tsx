"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { type LucideIcon, BookOpen } from "lucide-react";
import Link from "next/link";

interface RecipeCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  tags: string[];
  slug?: string;
  isCookbook?: boolean;
  recipeCount?: number;
}

export function RecipeCard({
  title,
  description,
  icon: Icon,
  tags,
  slug,
  isCookbook,
  recipeCount,
}: RecipeCardProps) {
  const cardContent = (
    <Card
      className={`group cursor-pointer border-border/50 bg-card transition-all duration-300 hover:border-primary/50 hover:bg-secondary/50 ${
        isCookbook ? "ring-1 ring-primary/20" : ""
      }`}
    >
      <CardContent className="p-6">
        <div className="mb-4 flex items-start justify-between">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-lg ${
              isCookbook ? "bg-primary/10" : "bg-secondary"
            }`}
          >
            <Icon
              className={`h-6 w-6 ${isCookbook ? "text-primary" : "text-primary"}`}
            />
          </div>
          {isCookbook && (
            <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
              <BookOpen className="h-3 w-3" />
              {recipeCount} recipes
            </div>
          )}
        </div>

        <h3 className="mb-2 font-mono text-lg font-semibold tracking-tight group-hover:text-primary">
          {title}
        </h3>

        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>

        <div className="flex flex-wrap gap-2">
          {tags
            .filter((tag) => tag !== "Cookbook")
            .map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="bg-secondary text-xs text-muted-foreground"
              >
                {tag}
              </Badge>
            ))}
        </div>
      </CardContent>
    </Card>
  );

  if (slug) {
    return <Link href={`/recipes/${slug}`}>{cardContent}</Link>;
  }

  return cardContent;
}
