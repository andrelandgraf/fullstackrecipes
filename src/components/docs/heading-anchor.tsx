"use client";

import { useState, type ReactNode } from "react";
import { Hash, Check } from "lucide-react";

type HeadingAnchorProps = {
  id: string;
  children: ReactNode;
};

export function HeadingAnchor({ id, children }: HeadingAnchorProps) {
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}#${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Silently fail
    }
  };

  return (
    <h2
      id={id}
      className="group flex scroll-mt-24 items-center gap-2 text-2xl font-semibold mt-6 mb-3"
    >
      {children}
      <button
        type="button"
        onClick={copyLink}
        className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground/50 opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
        aria-label="Copy link to section"
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <Hash className="h-4 w-4" />
        )}
      </button>
    </h2>
  );
}
