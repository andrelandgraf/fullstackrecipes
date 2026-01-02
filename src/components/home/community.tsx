import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Users,
  BookOpen,
  BookMarked,
  Sparkles,
  ArrowRight,
  Share2,
} from "lucide-react";

export function Community() {
  return (
    <section className="py-24 border-t border-border/50">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center mb-12">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary">
            <Users className="h-4 w-4" />
            Community
          </div>
          <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
            Create & Share Recipes
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Build your own recipes and share them with the community. Save your
            favorites to your library and access them via MCP.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-12">
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
            <CardHeader className="relative">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Create Recipes</CardTitle>
              <CardDescription>
                Write your own setup guides and skills in markdown. Keep them
                private or share with everyone.
              </CardDescription>
            </CardHeader>
            <CardContent className="relative">
              <Link href="/dashboard/recipes">
                <Button variant="outline" className="gap-2">
                  My Recipes
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
            <CardHeader className="relative">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Share2 className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Explore Community</CardTitle>
              <CardDescription>
                Discover recipes created by other developers. Find solutions to
                common problems and patterns.
              </CardDescription>
            </CardHeader>
            <CardContent className="relative">
              <Link href="/community">
                <Button variant="outline" className="gap-2">
                  Browse Community
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
            <CardHeader className="relative">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <BookMarked className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Your Library</CardTitle>
              <CardDescription>
                Bookmark recipes to your personal library. Access them anytime
                via the website or MCP tools.
              </CardDescription>
            </CardHeader>
            <CardContent className="relative">
              <Link href="/library">
                <Button variant="outline" className="gap-2">
                  My Library
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card p-8 text-center">
          <div className="mx-auto max-w-2xl">
            <Sparkles className="mx-auto h-10 w-10 text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              Access via MCP Tools
            </h3>
            <p className="text-muted-foreground mb-6">
              All your library recipes are available via MCP. Create, update,
              and list your recipes programmatically from your AI coding agent.
            </p>
            <code className="block rounded-lg bg-muted p-4 text-left text-sm font-mono mb-6">
              <span className="text-muted-foreground">
                // MCP tools for your recipes
              </span>
              <br />
              list_library_recipes
              <br />
              list_my_recipes
              <br />
              create_recipe
              <br />
              update_recipe
            </code>
          </div>
        </div>
      </div>
    </section>
  );
}

