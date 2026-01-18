"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Copy, Check, Terminal, ChevronRight, Package } from "lucide-react";
import { getRegistryItems } from "@/lib/recipes/data";

const REGISTRY_ITEMS = getRegistryItems();

function getTypeColor(type: string) {
  switch (type) {
    case "hook":
      return "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20";
    case "lib":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function Registry() {
  const [copied, setCopied] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(
    () => new Set(REGISTRY_ITEMS.map((item) => item.name)),
  );

  const installCommand = useMemo(() => {
    const selected = REGISTRY_ITEMS.filter((item) =>
      selectedItems.has(item.name),
    );
    if (selected.length === 0) return "# Select items to install";
    return `bunx shadcn@latest add ${selected.map((item) => `https://fullstackrecipes.com/r/${item.name}.json`).join(" ")}`;
  }, [selectedItems]);

  const toggleItem = (name: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const copyCommand = async () => {
    if (selectedItems.size === 0) return;
    await navigator.clipboard.writeText(installCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="border-b border-border/50 py-24">
      <div className="mx-auto max-w-4xl px-6">
        {/* Section Header */}
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <div className="mb-4 flex items-center justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-card shadow-sm">
              <Terminal className="h-6 w-6 text-primary" />
            </div>
          </div>
          <h2 className="mb-3 text-2xl font-bold tracking-tight">
            Shadcn Registry
          </h2>
          <p className="text-muted-foreground">
            Fullstackrecipes follows{" "}
            <a
              href="https://ui.shadcn.com/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline-offset-4 hover:underline"
            >
              Shadcn&apos;s Open Code approach
            </a>
            —you own the code. Each recipe provides complete, copy-paste
            instructions for your AI assistant. Some recipes also include
            reusable utilities you can install directly via the shadcn CLI.
          </p>
        </div>

        {/* Install Command Card */}
        <Card className="border-border/50 bg-card/50 p-4">
          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Terminal className="h-3.5 w-3.5" />
            <span>Install command</span>
          </div>
          <div className="group relative mb-4">
            <pre className="overflow-x-auto rounded-lg bg-background p-3 font-mono text-xs leading-relaxed">
              <code
                className={
                  selectedItems.size === 0
                    ? "text-muted-foreground"
                    : "text-foreground/90"
                }
              >
                {installCommand}
              </code>
            </pre>
            <Button
              size="icon"
              variant="ghost"
              onClick={copyCommand}
              disabled={selectedItems.size === 0}
              className="absolute right-2 top-1/2 h-7 w-7 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-50"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-primary" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>

          {/* Selection Summary + Drawer Trigger */}
          <Drawer>
            <DrawerTrigger asChild>
              <button className="flex w-full items-center justify-between rounded-lg border border-border/50 bg-background/50 px-4 py-3 text-left transition-colors hover:bg-background">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <span className="text-sm font-medium">
                      {selectedItems.size} of {REGISTRY_ITEMS.length} utilities
                      selected
                    </span>
                    <p className="text-xs text-muted-foreground">
                      Click to customize selection
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader className="border-b border-border/50">
                <DrawerTitle>Select Utilities</DrawerTitle>
                <DrawerDescription>
                  Choose which utilities to include in the install command
                </DrawerDescription>
              </DrawerHeader>
              <div className="max-h-[60vh] overflow-y-auto p-4">
                <div className="space-y-3">
                  {REGISTRY_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isSelected = selectedItems.has(item.name);
                    return (
                      <label
                        key={item.name}
                        className="flex cursor-pointer items-start gap-4 rounded-lg border border-border/50 bg-card/30 p-4 transition-colors hover:bg-card/60"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <span className="font-mono text-sm font-medium">
                              {item.name}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-1.5 py-0 ${getTypeColor(item.type)}`}
                            >
                              {item.type}
                            </Badge>
                          </div>
                          <p className="text-xs leading-relaxed text-muted-foreground">
                            {item.description}
                          </p>
                        </div>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleItem(item.name)}
                          className="mt-1.5 shrink-0"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            </DrawerContent>
          </Drawer>
        </Card>
      </div>
    </section>
  );
}
