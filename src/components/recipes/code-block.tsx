"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";
import { CopyButton, CodeCopyButton } from "@/components/docs/copy-button";

type CodeBlockProps = {
  filePath: string | null;
  fileExt: string | null;
  language: string;
  code: string;
  lightHtml: string;
  darkHtml: string;
  hasFilePath: boolean;
  className?: string;
};

export function CodeBlock({
  filePath,
  fileExt,
  language,
  code,
  lightHtml,
  darkHtml,
  hasFilePath,
  className,
}: CodeBlockProps) {
  const [isPathHovered, setIsPathHovered] = useState(false);
  const [isCodeHovered, setIsCodeHovered] = useState(false);
  const [isPathCopied, setIsPathCopied] = useState(false);

  const copyFilePath = async () => {
    if (
      !filePath ||
      typeof window === "undefined" ||
      !navigator?.clipboard?.writeText
    ) {
      return;
    }
    try {
      await navigator.clipboard.writeText(filePath);
      setIsPathCopied(true);
      setTimeout(() => setIsPathCopied(false), 2000);
    } catch {
      // Silently fail
    }
  };

  return (
    <div
      className={cn(
        "group relative w-full overflow-hidden rounded-md border bg-background text-foreground transition-all duration-200",
        isCodeHovered &&
          "ring-2 ring-primary/40 ring-offset-1 ring-offset-background",
        className,
      )}
    >
      {(language || hasFilePath) && (
        <div className="flex items-center justify-between gap-3 border-b bg-muted/40 px-3 py-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {hasFilePath ? (
              <>
                <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {fileExt}
                </span>
                <button
                  type="button"
                  onClick={copyFilePath}
                  onMouseEnter={() => setIsPathHovered(true)}
                  onMouseLeave={() => setIsPathHovered(false)}
                  className={cn(
                    "hover:text-foreground -mx-1 cursor-pointer truncate rounded px-1 font-mono text-xs text-foreground/80 transition-all duration-200",
                    (isPathHovered || isPathCopied) &&
                      "bg-primary/10 text-primary ring-1 ring-primary/30",
                  )}
                  title="Click to copy path"
                >
                  {filePath}
                </button>
                <CopyButton
                  text={filePath ?? ""}
                  label="Copy path"
                  onHoverChange={setIsPathHovered}
                  externalCopied={isPathCopied}
                />
              </>
            ) : (
              <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {language}
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <CodeCopyButton text={code} onHoverChange={setIsCodeHovered} />
          </div>
        </div>
      )}
      <div className="relative">
        <div
          className="overflow-x-auto dark:hidden [&>pre]:m-0 [&>pre]:bg-background! [&>pre]:p-4 [&>pre]:text-foreground! [&>pre]:text-sm [&_code]:font-mono [&_code]:text-sm"
          dangerouslySetInnerHTML={{ __html: lightHtml }}
        />
        <div
          className="hidden overflow-x-auto dark:block [&>pre]:m-0 [&>pre]:bg-background! [&>pre]:p-4 [&>pre]:text-foreground! [&>pre]:text-sm [&_code]:font-mono [&_code]:text-sm"
          dangerouslySetInnerHTML={{ __html: darkHtml }}
        />
        {!language && !hasFilePath && (
          <div className="absolute right-2 top-2">
            <CopyButton text={code} />
          </div>
        )}
      </div>
    </div>
  );
}
