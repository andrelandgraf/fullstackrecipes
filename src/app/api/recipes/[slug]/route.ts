import { NextResponse } from "next/server";
import { getItemBySlug, getRedirectSlug } from "@/lib/recipes/data";
import { loadRecipeMarkdown } from "@/lib/recipes/loader";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const item = getItemBySlug(slug);

  if (!item) {
    // Check if this is an old slug that should redirect
    const redirectSlug = getRedirectSlug(slug);
    if (redirectSlug) {
      const url = new URL(request.url);
      url.pathname = `/api/recipes/${redirectSlug}`;
      return NextResponse.redirect(url, 301);
    }
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  // Return transformed markdown (custom tags expanded for agent consumption)
  const content = await loadRecipeMarkdown(item);

  return NextResponse.json({ content });
}
