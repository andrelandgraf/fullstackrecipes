"use client";

import { useState } from "react";
import { Copy, Check, Package } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RegistryItem {
  name: string;
  title: string;
  description: string;
}

interface RegistryInstallProps {
  registryItems: RegistryItem[];
}

function getRegistryCommand(names: string[]) {
  const urls = names
    .map((name) => `https://fullstackrecipes.com/r/${name}.json`)
    .join(" ");
  return `bunx shadcn@latest add ${urls}`;
}

export function RegistryInstall({ registryItems }: RegistryInstallProps) {
  const [copied, setCopied] = useState(false);

  if (registryItems.length === 0) {
    return null;
  }

  const command = getRegistryCommand(registryItems.map((item) => item.name));

  const copyCommand = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-border/60 bg-gradient-to-b from-card/80 to-card/40 p-5">
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
          <Package className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold tracking-tight">
            Install via shadcn registry
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            All code is included in the recipe below. Use the CLI for quick
            setup.
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-border/50 bg-muted/50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          optional
        </span>
      </div>

      {/* Install command */}
      <div className="group relative mb-5">
        <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 px-4 py-3.5 font-mono text-[13px] leading-relaxed">
          <code className="text-foreground/90 whitespace-pre">{command}</code>
        </pre>
        <Button
          size="icon"
          variant="secondary"
          onClick={copyCommand}
          className="absolute right-2.5 top-1/2 h-8 w-8 -translate-y-1/2 opacity-60 transition-all hover:opacity-100 group-hover:opacity-100"
        >
          {copied ? (
            <Check className="h-4 w-4 text-primary" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Registry items grid */}
      <div className="grid gap-3 sm:grid-cols-2">
        {registryItems.map((item) => (
          <div
            key={item.name}
            className="flex flex-col gap-1.5 rounded-lg border border-border/40 bg-background/50 p-3.5"
          >
            <code className="w-fit rounded-md bg-primary/10 px-2 py-1 font-mono text-xs font-medium text-primary">
              {item.name}
            </code>
            <p className="text-[13px] leading-snug text-muted-foreground">
              {item.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
