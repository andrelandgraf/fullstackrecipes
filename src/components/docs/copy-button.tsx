"use client";

import { Button } from "@/components/ui/button";
import { CheckIcon, CopyIcon, FileCodeIcon } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

type CopyButtonProps = {
  text: string;
  timeout?: number;
  label?: string;
  className?: string;
  onHoverChange?: (isHovered: boolean) => void;
  externalCopied?: boolean;
};

export function CopyButton({
  text,
  timeout = 2000,
  label,
  className,
  onHoverChange,
  externalCopied,
}: CopyButtonProps) {
  const [internalCopied, setInternalCopied] = useState(false);
  const isCopied = externalCopied || internalCopied;

  const copyToClipboard = async () => {
    if (typeof window === "undefined" || !navigator?.clipboard?.writeText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setInternalCopied(true);
      setTimeout(() => setInternalCopied(false), timeout);
    } catch {
      // Silently fail
    }
  };

  const Icon = isCopied ? CheckIcon : CopyIcon;
  const ariaLabel = isCopied ? "Copied!" : (label ?? "Copy to clipboard");

  return (
    <Button
      className={cn(
        "size-6 opacity-0 transition-opacity group-hover:opacity-100",
        className,
      )}
      onClick={copyToClipboard}
      size="icon"
      variant="ghost"
      aria-label={ariaLabel}
      title={ariaLabel}
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
    >
      <Icon size={12} />
    </Button>
  );
}

type CodeCopyButtonProps = {
  text: string;
  timeout?: number;
  onHoverChange?: (isHovered: boolean) => void;
};

export function CodeCopyButton({
  text,
  timeout = 2000,
  onHoverChange,
}: CodeCopyButtonProps) {
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = async () => {
    if (typeof window === "undefined" || !navigator?.clipboard?.writeText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), timeout);
    } catch {
      // Silently fail
    }
  };

  const ariaLabel = isCopied ? "Copied!" : "Copy code";

  return (
    <Button
      className="h-6 gap-1.5 px-2 opacity-0 transition-opacity group-hover:opacity-100"
      onClick={copyToClipboard}
      size="sm"
      variant="ghost"
      aria-label={ariaLabel}
      title={ariaLabel}
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
    >
      <FileCodeIcon size={12} />
      {isCopied ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
    </Button>
  );
}
