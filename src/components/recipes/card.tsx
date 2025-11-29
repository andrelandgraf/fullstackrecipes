"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, type LucideIcon } from "lucide-react";
import Link from "next/link";

interface RecipeCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  tags: string[];
  difficulty: string;
  time: string;
  slug?: string;
}

export function RecipeCard({
  title,
  description,
  icon: Icon,
  tags,
  difficulty,
  time,
  slug,
}: RecipeCardProps) {
  const difficultyColor = {
    Beginner: "text-primary",
    Intermediate: "text-accent",
    Advanced: "text-chart-4",
  }[difficulty];

  const cardContent = (
    <Card className="group cursor-pointer border-border/50 bg-card transition-all duration-300 hover:border-primary/50 hover:bg-secondary/50">
      <CardContent className="p-6">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className={difficultyColor}>{difficulty}</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {time}
            </span>
          </div>
        </div>

        <h3 className="mb-2 font-mono text-lg font-semibold tracking-tight group-hover:text-primary">
          {title}
        </h3>

        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>

        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
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
