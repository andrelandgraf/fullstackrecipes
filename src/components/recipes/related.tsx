import { CompactRecipeCard } from "./compact-card";
import type { Recipe } from "@/lib/recipes/data";

interface RelatedRecipesProps {
  requiredRecipes: Recipe[];
  includedRecipes: Recipe[];
}

export function RelatedRecipes({
  requiredRecipes,
  includedRecipes,
}: RelatedRecipesProps) {
  if (requiredRecipes.length === 0 && includedRecipes.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {requiredRecipes.length > 0 && (
        <div>
          <p className="mb-3 text-sm text-muted-foreground">
            This recipe requires you to complete:
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {requiredRecipes.map((recipe) => (
              <CompactRecipeCard
                key={recipe.slug}
                title={recipe.title}
                description={recipe.description}
                icon={recipe.icon}
                slug={recipe.slug}
              />
            ))}
          </div>
        </div>
      )}

      {includedRecipes.length > 0 && (
        <div>
          <p className="mb-3 text-sm text-muted-foreground">
            This recipe also includes:
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {includedRecipes.map((recipe) => (
              <CompactRecipeCard
                key={recipe.slug}
                title={recipe.title}
                description={recipe.description}
                icon={recipe.icon}
                slug={recipe.slug}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
