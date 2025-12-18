import { NextResponse } from "next/server";
import { getItemBySlug } from "@/lib/recipes/data";
import { loadRecipeMarkdown } from "@/lib/recipes/loader";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const item = getItemBySlug(slug);

  if (!item) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  // Return transformed markdown (custom tags expanded for agent consumption)
  const content = await loadRecipeMarkdown(item);

  return NextResponse.json({ content });
}
