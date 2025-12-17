import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getAllItems,
  getItemBySlug,
  getCookbookRecipes,
  getRequiredItems,
  getRegistryItemsByNames,
  isCookbook,
} from "@/lib/recipes/data";
import { loadRecipeContent } from "@/lib/recipes/loader";
import { RecipeHeader } from "@/components/recipes/header";
import { MarkdownBlock } from "@/components/docs/markdown-block";
import { RelatedRecipes } from "@/components/recipes/related";
import { RegistryInstall } from "@/components/recipes/registry-install";
import { CookbookRecipes } from "@/components/recipes/cookbook-recipes";
import { serializeRecipes, serializeItems } from "@/lib/recipes/serialize";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const items = getAllItems();
  return items.map((item) => ({
    slug: item.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const item = getItemBySlug(slug);

  if (!item) {
    return {
      title: "Recipe Not Found",
      description: "The requested recipe could not be found.",
    };
  }

  return {
    title: item.title,
    description: item.description,
  };
}

export default async function RecipePage({ params }: Props) {
  const { slug } = await params;
  const item = getItemBySlug(slug);

  if (!item) {
    notFound();
  }

  const content = await loadRecipeContent(item);
  const requiredItems = getRequiredItems(item);
  const cookbookRecipes = isCookbook(item) ? getCookbookRecipes(item) : [];
  const registryItems = getRegistryItemsByNames(item.registryDeps ?? []);

  const hasPreContent =
    requiredItems.length > 0 ||
    (isCookbook(item) && cookbookRecipes.length > 0) ||
    registryItems.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <RecipeHeader
        title={item.title}
        description={item.description}
        tags={item.tags}
        icon={item.icon}
        markdownContent={content}
        isCookbook={isCookbook(item)}
        recipeCount={cookbookRecipes.length}
      />
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <RelatedRecipes requiredItems={serializeItems(requiredItems)} />
        {requiredItems.length > 0 && registryItems.length > 0 && (
          <div className="my-6" />
        )}
        <RegistryInstall registryItems={registryItems} />
        {(requiredItems.length > 0 || registryItems.length > 0) &&
          isCookbook(item) &&
          cookbookRecipes.length > 0 && <div className="my-6" />}
        {isCookbook(item) && cookbookRecipes.length > 0 && (
          <CookbookRecipes recipes={serializeRecipes(cookbookRecipes)} />
        )}
        {hasPreContent && <div className="my-8 border-t border-border" />}
        <MarkdownBlock content={content} />
      </main>
    </div>
  );
}
