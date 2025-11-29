import { Card, CardContent } from "@/components/ui/card";
import { type LucideIcon } from "lucide-react";
import Link from "next/link";

interface CompactRecipeCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  slug: string;
}

export function CompactRecipeCard({
  title,
  description,
  icon: Icon,
  slug,
}: CompactRecipeCardProps) {
  return (
    <Link href={`/recipes/${slug}`}>
      <Card className="group cursor-pointer border-border/50 bg-card transition-all duration-300 hover:border-primary/50 hover:bg-secondary/50">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="truncate font-mono text-sm font-medium group-hover:text-primary">
              {title}
            </h4>
            <p className="truncate text-xs text-muted-foreground">
              {description}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
