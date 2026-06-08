import { buildLandingMarkdown } from "@/lib/recipes/site-markdown";

export async function GET() {
  const content = await buildLandingMarkdown();

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
