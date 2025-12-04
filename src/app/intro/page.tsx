import fs from "fs/promises";
import path from "path";
import { MarkdownBlock } from "@/components/docs/markdown-block";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen } from "lucide-react";
import Link from "next/link";
import { RecipeGrid } from "@/components/recipes/grid";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Get Started",
  description:
    "Introduction to Fullstack Recipes - learn how to build production-ready full-stack AI apps with modern tooling.",
};

async function getContent() {
  const filePath = path.join(
    process.cwd(),
    "docs",
    "sections",
    "introduction.md",
  );
  return fs.readFile(filePath, "utf-8");
}

export default async function IntroPage() {
  const content = await getContent();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-4 py-6 sm:px-6 lg:px-8">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Get Started</h1>
              <p className="text-sm text-muted-foreground">
                Introduction to fullstackrecipes
              </p>
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <MarkdownBlock content={content} />
      </main>
      <RecipeGrid />
    </div>
  );
}
