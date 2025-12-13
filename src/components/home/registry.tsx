"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Copy, Check, Terminal } from "lucide-react";
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
            shadcn Registry
          </h2>
          <p className="text-sm text-muted-foreground">
            Install reusable utilities directly into your project via the shadcn
            CLI.
          </p>
        </div>

        {/* Install Command */}
        <Card className="mb-8 border-border/50 bg-card/50 p-4">
          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Terminal className="h-3.5 w-3.5" />
            <span>
              Install{" "}
              {selectedItems.size === REGISTRY_ITEMS.length
                ? "all"
                : selectedItems.size}{" "}
              {selectedItems.size === 1 ? "utility" : "utilities"}
            </span>
          </div>
          <div className="group relative">
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
        </Card>

        {/* Items List */}
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
    </section>
  );
}
