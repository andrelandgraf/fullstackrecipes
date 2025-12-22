import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { ThemeSelector } from "@/components/themes/selector";
import { AddToAgentButton } from "@/components/recipes/add-to-agent-button";
import { BackButton } from "@/components/recipes/back-button";
import { BookOpen, type LucideIcon } from "lucide-react";

const tagDescriptions: Record<string, string> = {
  Cookbooks: "Bundle of setup instructions and skills",
  "Setup Instructions": "Resource for adding a feature or pattern",
  Skills: "Workflow instructions for using a feature or pattern",
};

interface RecipeHeaderProps {
  title: string;
  description: string;
  tags: string[];
  icon: LucideIcon;
  isCookbook?: boolean;
  recipeCount?: number;
}

export function RecipeHeader({
  title,
  description,
  tags,
  icon: Icon,
  isCookbook,
  recipeCount,
}: RecipeHeaderProps) {
  return (
    <>
      {/* Fixed navigation bar */}
      <div className="fixed left-0 right-0 top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <BackButton />
          <div className="flex items-center gap-2">
            <AddToAgentButton />
            <ThemeSelector />
          </div>
        </div>
      </div>

      {/* Spacer for fixed nav */}
      <div className="h-14" />

      {/* Header content */}
      <header className="border-b border-border/50 bg-card/50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
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
              .map((tag) => {
                const description = tagDescriptions[tag];
                const badge = (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                );

                if (description) {
                  return (
                    <Tooltip key={tag}>
                      <TooltipTrigger asChild>{badge}</TooltipTrigger>
                      <TooltipContent>{description}</TooltipContent>
                    </Tooltip>
                  );
                }

                return badge;
              })}
          </div>
        </div>
      </header>
    </>
  );
}
