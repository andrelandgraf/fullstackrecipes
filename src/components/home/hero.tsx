import { Button } from "@/components/ui/button";
import { ArrowRight, Wand2 } from "lucide-react";
import { getAllItems } from "@/lib/recipes/data";
import { WizardTrigger } from "@/components/wizard/wizard-trigger";

const items = getAllItems();

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
            {items.length} recipes and cookbooks
          </div>

          <h1 className="mb-6 text-balance text-4xl font-bold tracking-tight md:text-6xl">
            Instructions for <span className="text-primary">AI Agents</span>
          </h1>

          <p className="mb-10 text-pretty text-lg text-muted-foreground md:text-xl">
            Copy markdown, install the MCP server, or use Claude plugins. Atomic
            setup guides and skills for auth, database, payments, and more.
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="gap-2 font-medium">
              <a href="#recipes">
                Browse Recipes
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>

            <WizardTrigger queryParam="wizard">
              <Button variant="outline" size="lg" className="gap-2 font-medium">
                <Wand2 className="h-4 w-4" />
                Build Your Stack
              </Button>
            </WizardTrigger>
          </div>
        </div>

        {/* Tech logos */}
        <div className="mt-20 border-t border-border/50 pt-10">
          <p className="mb-6 text-center text-sm text-muted-foreground">
            Recipes available for
          </p>
          <div className="mx-auto max-w-xl">
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-center opacity-60 sm:grid-cols-3 md:grid-cols-4">
              {[
                "Next.js",
                "React",
                "TypeScript",
                "Vercel",
                "Neon",
                "Drizzle",
                "better-auth",
                "Resend",
                "Stripe",
                "AI SDK",
                "WDK",
                "Bun",
              ].map((tech) => (
                <span key={tech} className="font-mono text-sm font-medium">
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
