"use client";

import { ExternalLink, Github, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyableCodeBox } from "@/components/code/copyable-code-box";
import { fullstackTemplate } from "@/lib/recipes/data";

/**
 * "Start with the template" section: the fullstackrecipe starter that bundles
 * every setup recipe. Offers one-click deploy, a live demo, the clone command,
 * and a link to browse the source.
 */
export function TemplateCta() {
  const cloneCommand = `npx tiged ${fullstackTemplate.tigedSource} my-app`;

  return (
    <div className="rounded-xl border border-border/60 bg-secondary/20 p-6 text-left backdrop-blur-sm">
      <div className="mb-1 flex items-center gap-2">
        <h3 className="text-sm font-medium">Start with the template</h3>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
          every setup recipe
        </span>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        A production-ready Next.js app with auth, AI chat, durable workflows,
        Stripe, observability, and testing — wired up and ready to ship.
      </p>

      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <Button asChild size="sm" className="gap-2">
          <a
            href={fullstackTemplate.deployUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Rocket className="h-4 w-4" />
            Deploy to Vercel
          </a>
        </Button>
        <Button asChild size="sm" variant="outline" className="gap-2">
          <a
            href={fullstackTemplate.liveUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="h-4 w-4" />
            Live demo
          </a>
        </Button>
        <Button asChild size="sm" variant="outline" className="gap-2">
          <a
            href={fullstackTemplate.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Github className="h-4 w-4" />
            Source
          </a>
        </Button>
      </div>

      <CopyableCodeBox code={cloneCommand} truncate />
    </div>
  );
}
