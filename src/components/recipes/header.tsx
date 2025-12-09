import { Badge } from "@/components/ui/badge";
import { ThemeSelector } from "@/components/themes/selector";
import { CopyMarkdownButton } from "@/components/recipes/copy-markdown-button";
import { ArrowLeft, BookOpen, type LucideIcon } from "lucide-react";
import Link from "next/link";

interface RecipeHeaderProps {
  title: string;
  description: string;
  tags: string[];
  icon: LucideIcon;
  markdownContent?: string;
  isCookbook?: boolean;
  recipeCount?: number;
}

export function RecipeHeader({
  title,
  description,
  tags,
  icon: Icon,
  markdownContent,
  isCookbook,
  recipeCount,
}: RecipeHeaderProps) {
  return (
    <header className="border-b border-border/50 bg-card/50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to recipes
          </Link>
          <div className="flex items-center gap-2">
            {markdownContent && (
              <CopyMarkdownButton content={markdownContent} />
            )}
            <ThemeSelector />
          </div>
        </div>

        <div className="mb-4 flex items-center gap-4">
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-xl ${
              isCookbook ? "bg-primary/10" : "bg-secondary"
            }`}
          >
            <Icon className="h-7 w-7 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-mono text-3xl font-bold tracking-tight">
                {title}
              </h1>
              {isCookbook && (
                <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                  <BookOpen className="h-4 w-4" />
                  {recipeCount} recipes
                </div>
              )}
            </div>
          </div>
        </div>

        <p className="mb-4 max-w-2xl text-lg text-muted-foreground">
          {description}
        </p>

        <div className="flex flex-wrap gap-2">
          {tags
            .filter((tag) => tag !== "Cookbook")
            .map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
        </div>
      </div>
    </header>
  );
}
