import type { Metadata } from "next";
import { Header } from "@/components/home/header";
import { Footer } from "@/components/home/footer";
import { Button } from "@/components/ui/button";
import { ChefHat, Home, Search } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page Not Found",
  description:
    "The page you're looking for doesn't exist. Head back to explore our full-stack recipes and guides.",
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center relative overflow-hidden">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20" />

        <div className="relative mx-auto max-w-2xl px-6 py-24 text-center">
          {/* Floating chef hat with 404 */}
          <div className="mb-8 inline-flex flex-col items-center">
            <div className="relative">
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
                <ChefHat className="h-12 w-12 text-primary" />
              </div>
              <div className="absolute -bottom-3 -right-3 flex h-10 w-10 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-sm font-bold shadow-lg">
                ?!
              </div>
            </div>
          </div>

          {/* 404 Number */}
          <div className="mb-4 font-mono text-8xl font-bold tracking-tighter text-primary/20 md:text-9xl">
            404
          </div>

          <h1 className="mb-4 text-balance text-2xl font-bold tracking-tight md:text-3xl">
            Recipe <span className="text-primary">Not Found</span>
          </h1>

          <p className="mb-8 text-pretty text-muted-foreground md:text-lg">
            Looks like this dish isn&apos;t on the menu. The page you&apos;re
            looking for might have been moved, deleted, or never existed in our
            cookbook.
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="gap-2 font-medium">
              <Link href="/">
                <Home className="h-4 w-4" />
                Back to Kitchen
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              size="lg"
              className="gap-2 font-medium"
            >
              <Link href="/#recipes">
                <Search className="h-4 w-4" />
                Browse Recipes
              </Link>
            </Button>
          </div>

          {/* Decorative elements */}
          <div className="mt-16 flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <span className="h-px w-12 bg-border" />
            <span className="font-mono">lost in the pantry</span>
            <span className="h-px w-12 bg-border" />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
