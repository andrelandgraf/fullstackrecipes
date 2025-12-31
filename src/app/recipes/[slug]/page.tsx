import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import {
  getAllItems,
  getItemBySlug,
  getCookbookRecipes,
  getRequiredItems,
  isCookbook,
  getRedirectSlug,
  recipeRedirects,
} from "@/lib/recipes/data";
import { loadRecipeContent } from "@/lib/recipes/loader";
import { RecipeHeader } from "@/components/recipes/header";
import { MarkdownBlock } from "@/components/docs/markdown-block";
import { RelatedRecipes } from "@/components/recipes/related";
import { CookbookRecipes } from "@/components/recipes/cookbook-recipes";
import { serializeRecipes, serializeItems } from "@/lib/recipes/serialize";
import { DetailWrapper } from "@/components/recipes/detail-wrapper";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const items = getAllItems();
  const redirectSlugs = Object.keys(recipeRedirects);
  return [
    ...items.map((item) => ({ slug: item.slug })),
    ...redirectSlugs.map((slug) => ({ slug })),
  ];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  let item = getItemBySlug(slug);

  // Handle redirects - use target item's metadata
  if (!item) {
    const redirectSlug = getRedirectSlug(slug);
    if (redirectSlug) {
      item = getItemBySlug(redirectSlug);
    }
  }

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
    // Check if this is an old slug that should redirect
    const redirectSlug = getRedirectSlug(slug);
    if (redirectSlug) {
      redirect(`/recipes/${redirectSlug}`);
    }
    notFound();
  }

  const content = await loadRecipeContent(item);
  const requiredItems = getRequiredItems(item);
  const cookbookRecipes = isCookbook(item) ? getCookbookRecipes(item) : [];

  const hasPreContent =
    requiredItems.length > 0 ||
    (isCookbook(item) && cookbookRecipes.length > 0);

  return (
    <DetailWrapper slug={item.slug}>
      <div className="min-h-screen bg-background">
        <RecipeHeader
          title={item.title}
          description={item.description}
          tags={item.tags}
          icon={item.icon}
          isCookbook={isCookbook(item)}
          recipeCount={cookbookRecipes.length}
          template={isCookbook(item) ? item.template : undefined}
        />
        <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <RelatedRecipes requiredItems={serializeItems(requiredItems)} />
          {requiredItems.length > 0 &&
            isCookbook(item) &&
            cookbookRecipes.length > 0 && <div className="my-6" />}
          {isCookbook(item) && cookbookRecipes.length > 0 && (
            <CookbookRecipes recipes={serializeRecipes(cookbookRecipes)} />
          )}
          {hasPreContent && <div className="my-8 border-t border-border" />}
          <MarkdownBlock content={content} />
        </main>
      </div>
    </DetailWrapper>
  );
}
