import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { ChefHat, ArrowLeft, User, Calendar, Bookmark } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { auth } from "@/lib/auth/server";
import { getUserRecipeById, isBookmarked } from "@/lib/recipes/queries";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserMenu } from "@/components/auth/user-menu";
import { ThemeSelector } from "@/components/themes/selector";
import { CommunityRecipeContent } from "@/components/recipes/community-content";
import { db } from "@/lib/db/client";
import { users } from "@/lib/auth/schema";
import { eq } from "drizzle-orm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const recipe = await getUserRecipeById(id);

  if (!recipe || !recipe.isPublic) {
    return { title: "Recipe Not Found" };
  }

  return {
    title: recipe.title,
    description: recipe.description || `A community recipe by ${recipe.userId}`,
  };
}

export default async function CommunityRecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const recipe = await getUserRecipeById(id);

  if (!recipe || !recipe.isPublic) {
    notFound();
  }

  // Get the author's name
  const author = await db.query.users.findFirst({
    where: eq(users.id, recipe.userId),
    columns: { name: true },
  });

  const isUserBookmarked = session
    ? await isBookmarked(session.user.id, { userRecipeId: recipe.id })
    : false;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/community">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="size-4" />
              </Button>
            </Link>
            <Link
              href="/"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
                <ChefHat className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-mono text-lg font-semibold tracking-tight">
                full<span className="text-primary">stack</span>recipes
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <ThemeSelector />
            {session ? (
              <UserMenu />
            ) : (
              <Link href="/sign-in">
                <Button variant="outline" size="sm">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <article>
          <header className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-4">
              {recipe.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
              <div className="flex items-center gap-1">
                <User className="size-4" />
                <span>{author?.name || "Unknown"}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="size-4" />
                <span>
                  {formatDistanceToNow(new Date(recipe.createdAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            </div>

            {recipe.description && (
              <p className="text-lg text-muted-foreground mb-4">
                {recipe.description}
              </p>
            )}

            {recipe.tags && recipe.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {recipe.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            <CommunityRecipeContent
              recipeId={recipe.id}
              isBookmarked={isUserBookmarked}
              isAuthenticated={!!session}
            />
          </header>

          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <div
              dangerouslySetInnerHTML={{
                __html: await renderMarkdown(recipe.content),
              }}
            />
          </div>
        </article>
      </main>
    </div>
  );
}

async function renderMarkdown(content: string): Promise<string> {
  // Simple markdown to HTML conversion
  // In production, you'd use a proper markdown library like marked or remark
  const escaped = content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return escaped
    .replace(/^### (.*$)/gim, "<h3>$1</h3>")
    .replace(/^## (.*$)/gim, "<h2>$1</h2>")
    .replace(/^# (.*$)/gim, "<h1>$1</h1>")
    .replace(/\*\*(.*)\*\*/gim, "<strong>$1</strong>")
    .replace(/\*(.*)\*/gim, "<em>$1</em>")
    .replace(/```(\w+)?\n([\s\S]*?)```/gim, "<pre><code>$2</code></pre>")
    .replace(/`([^`]+)`/gim, "<code>$1</code>")
    .replace(/^\- (.*$)/gim, "<li>$1</li>")
    .replace(/^\d+\. (.*$)/gim, "<li>$1</li>")
    .replace(/\n/gim, "<br>");
}
