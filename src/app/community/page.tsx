import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { ChefHat, Plus } from "lucide-react";
import { auth } from "@/lib/auth/server";
import {
  getPublicRecipes,
  getUserBookmarkUserRecipeIds,
} from "@/lib/recipes/queries";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/auth/user-menu";
import { ThemeSelector } from "@/components/themes/selector";
import { CommunityRecipeGrid } from "@/components/recipes/community-grid";

export const metadata: Metadata = {
  title: "Community Recipes",
  description: "Explore recipes created and shared by the community.",
};

export default async function CommunityPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const recipes = await getPublicRecipes();
  const bookmarkedIds = session
    ? await getUserBookmarkUserRecipeIds(session.user.id)
    : new Set<string>();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
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
            <span className="text-xs font-semibold text-accent-foreground bg-accent px-2.5 py-1 rounded-full">
              community
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeSelector />
            {session ? (
              <>
                <Link href="/dashboard/recipes/new">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Plus className="size-4" />
                    Share Recipe
                  </Button>
                </Link>
                <UserMenu />
              </>
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

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            Community Recipes
          </h1>
          <p className="text-muted-foreground mt-1">
            Explore recipes created and shared by developers like you
          </p>
        </div>

        <CommunityRecipeGrid
          initialRecipes={recipes}
          bookmarkedIds={bookmarkedIds}
          isAuthenticated={!!session}
        />
      </main>
    </div>
  );
}
