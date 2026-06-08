"use client";

import { useState } from "react";
import { Copy, Check, Terminal, ArrowRight, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WizardTrigger } from "@/components/wizard/wizard-trigger";
import { CommandBox } from "@/components/recipes/fetch-markdown-steps";
import { getSkillsInstallCommand } from "@/lib/recipes/data";

const FETCH_INDEX_COMMAND = "curl https://fullstackrecipes.com/llms.txt";

export function InstallSection() {
  const [copied, setCopied] = useState(false);

  const skillsCommand = getSkillsInstallCommand();

  async function copyToClipboard(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mt-10 w-full max-w-2xl space-y-6">
      {/* CTA Buttons */}
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Button
          asChild
          size="lg"
          className="w-full gap-2 font-medium sm:w-auto"
        >
          <a href="#recipes">
            Browse Recipes
            <ArrowRight className="h-4 w-4" />
          </a>
        </Button>

        <WizardTrigger queryParam="wizard">
          <Button
            variant="outline"
            size="lg"
            className="w-full gap-2 font-medium sm:w-auto"
          >
            <Wand2 className="h-4 w-4" />
            Add to Agent
          </Button>
        </WizardTrigger>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border/50" />
        <span className="text-xs text-muted-foreground">
          or install all recipes and skills
        </span>
        <div className="h-px flex-1 bg-border/50" />
      </div>

      {/* Skills Section */}
      <div className="rounded-xl border border-border/60 bg-secondary/20 p-6 text-left backdrop-blur-sm">
        <div className="mb-4 flex items-start gap-3">
          <h3 className="text-sm font-medium">Add all skills to your agent</h3>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-background px-3 py-2.5">
          <Terminal className="h-4 w-4 shrink-0 text-muted-foreground" />
          <code className="flex-1 overflow-x-auto whitespace-nowrap font-mono text-xs text-foreground/90 sm:text-sm">
            {skillsCommand}
          </code>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyToClipboard(skillsCommand)}
            className="h-7 w-7 shrink-0 p-0"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* Fetch Markdown Section */}
      <div className="rounded-xl border border-border/60 bg-secondary/20 p-6 text-left backdrop-blur-sm">
        <h3 className="mb-1 text-sm font-medium">Fetch recipes as Markdown</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Append <code className="font-mono">.md</code> to any URL. Start with
          the index, then fetch any recipe.
        </p>
        <CommandBox command={FETCH_INDEX_COMMAND} />
      </div>
    </div>
  );
}
