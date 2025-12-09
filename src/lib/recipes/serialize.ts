import type { Recipe, Cookbook } from "./data";
import { isCookbook } from "./data";

/** Serializable recipe data for Client Components (excludes icon) */
export type SerializedRecipe = {
  slug: string;
  title: string;
  description: string;
  iconName: string;
};

/** Serializable item (recipe or cookbook) for Client Components */
export type SerializedItem = SerializedRecipe & {
  isCookbook?: boolean;
};

/** Convert recipes to serializable format for Client Components */
export function serializeRecipes(recipes: Recipe[]): SerializedRecipe[] {
  return recipes.map((recipe) => ({
    slug: recipe.slug,
    title: recipe.title,
    description: recipe.description,
    iconName: recipe.icon.displayName ?? "Circle",
  }));
}

/** Convert items (recipes or cookbooks) to serializable format */
export function serializeItems(items: (Recipe | Cookbook)[]): SerializedItem[] {
  return items.map((item) => ({
    slug: item.slug,
    title: item.title,
    description: item.description,
    iconName: item.icon.displayName ?? "Circle",
    isCookbook: isCookbook(item) ? true : undefined,
  }));
}
