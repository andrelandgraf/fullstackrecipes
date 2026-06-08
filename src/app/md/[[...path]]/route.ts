import { NextResponse } from "next/server";
import { getItemBySlug, getRedirectSlug } from "@/lib/recipes/data";
import { loadRecipeMarkdown } from "@/lib/recipes/loader";
import { buildLandingMarkdown } from "@/lib/recipes/site-markdown";

const MARKDOWN_HEADERS = {
  "Content-Type": "text/markdown; charset=utf-8",
} as const;

function markdown(content: string): Response {
  return new Response(content, { headers: MARKDOWN_HEADERS });
}

/**
 * Serves a Markdown representation of any page on the site. A rewrite in
 * `next.config.ts` maps `/<anything>.md` to this handler, so appending `.md`
 * to any URL returns the page content as Markdown — replacing the old MCP
 * server as the way agents fetch recipes.
 *
 * - `/.md` and `/index.md` -> the landing page (authored in `docs/landing.md`)
 * - `/<slug>.md` and `/recipes/<slug>.md` -> the recipe/cookbook source markdown
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const { path = [] } = await params;
  const segments = path.filter((segment) => segment.length > 0);

  if (
    segments.length === 0 ||
    (segments.length === 1 && segments[0] === "index")
  ) {
    return markdown(await buildLandingMarkdown());
  }

  // Support both `/<slug>.md` and `/recipes/<slug>.md`.
  const slug = segments[segments.length - 1];
  const item = getItemBySlug(slug) ?? resolveRedirect(slug);

  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return markdown(await loadRecipeMarkdown(item));
}

function resolveRedirect(slug: string) {
  const redirectSlug = getRedirectSlug(slug);
  return redirectSlug ? getItemBySlug(redirectSlug) : undefined;
}
