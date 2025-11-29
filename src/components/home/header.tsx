"use client";

import { Button } from "@/components/ui/button";
import { ChefHat, Github } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
            <ChefHat className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-mono text-lg font-semibold tracking-tight">
            full<span className="text-primary">stack</span>recipes
          </span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground"
          asChild
        >
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Github className="h-5 w-5" />
          </a>
        </Button>
      </div>
    </header>
  );
}
