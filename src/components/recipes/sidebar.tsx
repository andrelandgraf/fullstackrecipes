"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface TocItem {
  id: string;
  title: string;
  level: number;
}

interface RecipeSidebarProps {
  tableOfContents: TocItem[];
}

export function RecipeSidebar({ tableOfContents }: RecipeSidebarProps) {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: "-80px 0px -80% 0px" },
    );

    tableOfContents.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [tableOfContents]);

  return (
    <aside className="hidden w-64 shrink-0 lg:block">
      <nav className="sticky top-24">
        <h4 className="mb-4 font-mono text-sm font-semibold text-foreground">
          On this page
        </h4>
        <ul className="space-y-2 border-l border-border/50">
          {tableOfContents.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className={cn(
                  "block border-l-2 py-1 text-sm transition-colors",
                  item.level === 2 ? "pl-4" : "pl-6",
                  activeId === item.id
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
                )}
              >
                {item.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
