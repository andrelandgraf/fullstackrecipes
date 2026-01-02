import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { ChefHat, Plus } from "lucide-react";
import { auth } from "@/lib/auth/server";
import { getUserRecipes } from "@/lib/recipes/queries";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/auth/user-menu";
import { ThemeSelector } from "@/components/themes/selector";
import { RecipeDashboardList } from "@/components/recipes/dashboard-list";

export const metadata: Metadata = {
  title: "My Recipes",
  description: "Create and manage your own recipes to share with the community.",
};

export default async function DashboardRecipesPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const recipes = await getUserRecipes(session.user.id);

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
              my recipes
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeSelector />
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Recipes</h1>
            <p className="text-muted-foreground mt-1">
              Create and manage your own recipes
            </p>
          </div>
          <Link href="/dashboard/recipes/new">
            <Button className="gap-2">
              <Plus className="size-4" />
              New Recipe
            </Button>
          </Link>
        </div>

        <RecipeDashboardList initialRecipes={recipes} />
      </main>
    </div>
  );
}

