import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getRecipeBySlug,
  getAllRecipes,
  getIncludedRecipes,
  getRequiredRecipes,
} from "@/lib/recipes/data";
import { loadRecipeContent } from "@/lib/recipes/loader";
import { RecipeHeader } from "@/components/recipes/header";
import { MarkdownBlock } from "@/components/docs/markdown-block";
import { RelatedRecipes } from "@/components/recipes/related";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const recipes = getAllRecipes();
  return recipes.map((recipe) => ({
    slug: recipe.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const recipe = getRecipeBySlug(slug);

  if (!recipe) {
    return {
      title: "Recipe Not Found",
      description: "The requested recipe could not be found.",
    };
  }

  return {
    title: recipe.title,
    description: recipe.description,
  };
}

export default async function RecipePage({ params }: Props) {
  const { slug } = await params;
  const recipe = getRecipeBySlug(slug);

  if (!recipe) {
    notFound();
  }

  const content = await loadRecipeContent(recipe);
  const requiredRecipes = getRequiredRecipes(recipe);
  const includedRecipes = getIncludedRecipes(recipe);

  return (
    <div className="min-h-screen bg-background">
      <RecipeHeader
        title={recipe.title}
        description={recipe.description}
        tags={recipe.tags}
        icon={recipe.icon}
        markdownContent={content}
      />
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <RelatedRecipes
          requiredRecipes={requiredRecipes}
          includedRecipes={includedRecipes}
        />
        {(requiredRecipes.length > 0 || includedRecipes.length > 0) && (
          <div className="my-8 border-t border-border" />
        )}
        <MarkdownBlock content={content} />
      </main>
    </div>
  );
}
