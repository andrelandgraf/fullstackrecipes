"use client";

import { Button } from "@/components/ui/button";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";

type CopyMarkdownButtonProps = {
  content: string;
};

export function CopyMarkdownButton({ content }: CopyMarkdownButtonProps) {
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = async () => {
    if (typeof window === "undefined" || !navigator?.clipboard?.writeText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Silently fail
    }
  };

  return (
    <Button
      onClick={copyToClipboard}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      {isCopied ? (
        <>
          <CheckIcon className="h-4 w-4" />
          Copied
        </>
      ) : (
        <>
          <CopyIcon className="h-4 w-4" />
          Copy as Markdown
        </>
      )}
    </Button>
  );
}
