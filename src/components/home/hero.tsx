import { Button } from "@/components/ui/button";
import { ArrowRight, Copy, Layers } from "lucide-react";
import Link from "next/link";
import { recipes } from "@/lib/recipes/data";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border/50 py-24 md:py-32">
      {/* Subtle grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20" />

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-1.5 text-sm text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            Now with {recipes.length} production-ready recipes
          </div>

          <h1 className="mb-6 text-balance text-4xl font-bold tracking-tight md:text-6xl">
            Production Patterns for{" "}
            <span className="text-primary">Full Stack</span> React
          </h1>

          <p className="mb-10 text-pretty text-lg text-muted-foreground md:text-xl">
            Copy-paste recipes to add databases, AI capabilities, payments, and
            more to your React applications.
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="gap-2 font-medium">
              <a href="#recipes">
                Browse Recipes
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>

            <Button
              asChild
              variant="outline"
              size="lg"
              className="gap-2 font-medium"
            >
              <Link href="/philosophy">
                <Layers className="h-4 w-4" />
                Philosophy
              </Link>
            </Button>
          </div>
        </div>

        {/* Tech logos */}
        <div className="mt-20 border-t border-border/50 pt-10">
          <p className="mb-6 text-center text-sm text-muted-foreground">
            Purpose-built for
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 opacity-60">
            {[
              "Next.js",
              "React",
              "TypeScript",
              "Vercel",
              "Neon",
              "Stripe",
              "AI SDK",
              "Workflow Development Kit",
              "Bun",
            ].map((tech) => (
              <span key={tech} className="font-mono text-sm font-medium">
                {tech}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
