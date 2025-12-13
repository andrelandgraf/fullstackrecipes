"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";
import { CopyButton, CodeCopyButton } from "./copy-button";

type CodeBlockClientProps = {
  filePath: string | null;
  fileExt: string | null;
  language: string;
  code: string;
  lightHtml: string;
  darkHtml: string;
  hasFilePath: boolean;
};

export function CodeBlockClient({
  filePath,
  fileExt,
  language,
  code,
  lightHtml,
  darkHtml,
  hasFilePath,
}: CodeBlockClientProps) {
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
        "group relative w-full overflow-hidden rounded-md border bg-background text-foreground my-4 transition-all duration-200",
        isCodeHovered &&
          "ring-2 ring-primary/40 ring-offset-1 ring-offset-background",
      )}
    >
      {(language || hasFilePath) && (
        <div className="flex items-center justify-between gap-3 border-b bg-muted/40 px-3 py-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
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
                    "truncate font-mono text-xs text-foreground/80 transition-all duration-200 rounded px-1 -mx-1 cursor-pointer hover:text-foreground",
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
          <div className="flex items-center gap-1.5 shrink-0">
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
          <div className="absolute top-2 right-2">
            <CopyButton text={code} />
          </div>
        )}
      </div>
    </div>
  );
}
