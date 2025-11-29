import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, Github, type LucideIcon } from "lucide-react";
import Link from "next/link";

interface RecipeHeaderProps {
  title: string;
  description: string;
  difficulty: string;
  time: string;
  tags: string[];
  icon: LucideIcon;
}

export function RecipeHeader({
  title,
  description,
  difficulty,
  time,
  tags,
  icon: Icon,
}: RecipeHeaderProps) {
  const difficultyColor = {
    Beginner: "text-primary",
    Intermediate: "text-accent",
    Advanced: "text-chart-4",
  }[difficulty];

  return (
    <header className="border-b border-border/50 bg-card/50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back link */}
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to recipes
        </Link>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1">
            {/* Icon + Title */}
            <div className="mb-4 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary">
                <Icon className="h-7 w-7 text-primary" />
              </div>
              <h1 className="font-mono text-3xl font-bold tracking-tight">
                {title}
              </h1>
            </div>

            {/* Description */}
            <p className="mb-4 max-w-2xl text-lg text-muted-foreground">
              {description}
            </p>

            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-4">
              <span className={`text-sm font-medium ${difficultyColor}`}>
                {difficulty}
              </span>
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {time}
              </span>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 bg-transparent"
            >
              <Github className="h-4 w-4" />
              View source
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
