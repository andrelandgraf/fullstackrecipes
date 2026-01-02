"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeSelector } from "@/components/themes/selector";
import { ChefHat, Github, Users, BookMarked, BookOpen } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
              <ChefHat className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-mono text-lg font-semibold tracking-tight">
              full<span className="text-primary">stack</span>recipes
            </span>
          </Link>
          <nav className="hidden sm:flex items-center gap-1">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/community" className="gap-1.5">
                <Users className="h-4 w-4" />
                Community
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/library" className="gap-1.5">
                <BookMarked className="h-4 w-4" />
                Library
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/recipes" className="gap-1.5">
                <BookOpen className="h-4 w-4" />
                My Recipes
              </Link>
            </Button>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <ThemeSelector />
          <Button variant="outline" size="icon" asChild>
            <a
              href="https://github.com/andrelandgraf/fullstackrecipes"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github className="h-5 w-5" />
            </a>
          </Button>
        </div>
      </div>
    </header>
  );
}
