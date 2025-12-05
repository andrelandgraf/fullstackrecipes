import { NextResponse } from "next/server";
import { getRecipeBySlug } from "@/lib/recipes/data";
import { loadRecipeContent } from "@/lib/recipes/loader";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const recipe = getRecipeBySlug(slug);

  if (!recipe) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  const content = await loadRecipeContent(recipe);

  return NextResponse.json({ content });
}
