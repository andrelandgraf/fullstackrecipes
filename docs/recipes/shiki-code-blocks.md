# Shiki Code Blocks

Syntax highlight code blocks with Shiki. Supports server-side rendering in React Server Components and automatic light/dark theme switching.

## File Structure

```
src/components/code/
  code-block.tsx        # Code block with copy button
  copy-button.tsx       # Copy to clipboard button
```

---

## Setup

### Step 1: Install Shiki

```bash
bun add shiki
```

### Step 2: Create the copy button component

```tsx
// src/components/code/copy-button.tsx
"use client";

import { Button } from "@/components/ui/button";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type CopyButtonProps = {
  text: string;
  timeout?: number;
  className?: string;
};

export function CopyButton({
  text,
  timeout = 2000,
  className,
}: CopyButtonProps) {
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

  const Icon = isCopied ? CheckIcon : CopyIcon;
  const ariaLabel = isCopied ? "Copied!" : "Copy to clipboard";

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
    >
      <Icon size={12} />
    </Button>
  );
}
```

### Step 3: Create the code block component

```tsx
// src/components/code/code-block.tsx
"use client";

import { cn } from "@/lib/utils";
import { CopyButton } from "@/components/code/copy-button";

type CodeBlockProps = {
  code: string;
  language: string;
  lightHtml: string;
  darkHtml: string;
  className?: string;
};

export function CodeBlock({
  code,
  language,
  lightHtml,
  darkHtml,
  className,
}: CodeBlockProps) {
  return (
    <div
      className={cn(
        "group relative w-full overflow-hidden rounded-md border bg-background",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-2">
        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {language}
        </span>
        <CopyButton text={code} />
      </div>
      <div className="relative">
        <div
          className="overflow-x-auto dark:hidden [&>pre]:m-0 [&>pre]:bg-background! [&>pre]:p-4 [&>pre]:text-sm [&_code]:font-mono [&_code]:text-sm"
          dangerouslySetInnerHTML={{ __html: lightHtml }}
        />
        <div
          className="hidden overflow-x-auto dark:block [&>pre]:m-0 [&>pre]:bg-background! [&>pre]:p-4 [&>pre]:text-sm [&_code]:font-mono [&_code]:text-sm"
          dangerouslySetInnerHTML={{ __html: darkHtml }}
        />
      </div>
    </div>
  );
}
```

### Step 4: Create the highlight utility

```tsx
// src/lib/code/highlight.ts
import { codeToHtml, type BundledLanguage } from "shiki";

export async function highlightCode(code: string, language: BundledLanguage) {
  const [light, dark] = await Promise.all([
    codeToHtml(code, {
      lang: language,
      theme: "one-light",
    }),
    codeToHtml(code, {
      lang: language,
      theme: "one-dark-pro",
    }),
  ]);
  return { light, dark };
}
```

---

## Usage

### Server-side highlighting (React Server Components)

Highlight code at build time or request time in a Server Component:

```tsx
// src/components/docs/code-example.tsx
import { CodeBlock } from "@/components/code/code-block";
import { highlightCode } from "@/lib/code/highlight";

type CodeExampleProps = {
  code: string;
  language: string;
};

export async function CodeExample({ code, language }: CodeExampleProps) {
  const { light, dark } = await highlightCode(code, language as any);

  return (
    <CodeBlock
      code={code}
      language={language}
      lightHtml={light}
      darkHtml={dark}
    />
  );
}
```

Use in a page:

```tsx
// src/app/docs/page.tsx
import { CodeExample } from "@/components/docs/code-example";

const exampleCode = `const greeting = "Hello, World!";
console.log(greeting);`;

export default function DocsPage() {
  return (
    <div className="space-y-4">
      <h1>Documentation</h1>
      <CodeExample code={exampleCode} language="typescript" />
    </div>
  );
}
```

### Client-side highlighting

For dynamic code that changes at runtime:

```tsx
// src/components/code/dynamic-code-block.tsx
"use client";

import { useState, useEffect } from "react";
import { codeToHtml, type BundledLanguage } from "shiki";
import { CodeBlock } from "@/components/code/code-block";

type DynamicCodeBlockProps = {
  code: string;
  language: BundledLanguage;
};

export function DynamicCodeBlock({ code, language }: DynamicCodeBlockProps) {
  const [html, setHtml] = useState<{ light: string; dark: string } | null>(
    null,
  );

  useEffect(() => {
    let mounted = true;

    Promise.all([
      codeToHtml(code, { lang: language, theme: "one-light" }),
      codeToHtml(code, { lang: language, theme: "one-dark-pro" }),
    ]).then(([light, dark]) => {
      if (mounted) {
        setHtml({ light, dark });
      }
    });

    return () => {
      mounted = false;
    };
  }, [code, language]);

  if (!html) {
    return (
      <div className="rounded-md border bg-background p-4">
        <pre className="overflow-x-auto font-mono text-sm">
          <code>{code}</code>
        </pre>
      </div>
    );
  }

  return (
    <CodeBlock
      code={code}
      language={language}
      lightHtml={html.light}
      darkHtml={html.dark}
    />
  );
}
```

### Supported languages

Shiki supports all TextMate grammar languages. Common languages:

```typescript
const SUPPORTED_LANGUAGES = [
  "typescript",
  "javascript",
  "tsx",
  "jsx",
  "json",
  "bash",
  "shell",
  "css",
  "html",
  "sql",
  "yaml",
  "markdown",
  "python",
  "go",
  "rust",
  "dotenv",
] as const;
```

### Available themes

Use different themes for light and dark modes:

```typescript
// Light themes
"one-light";
"github-light";
"vitesse-light";

// Dark themes
"one-dark-pro";
"github-dark";
"vitesse-dark";
"dracula";
"nord";
```

### Adding line numbers

Use a Shiki transformer to add line numbers:

```typescript
import { codeToHtml, type ShikiTransformer } from "shiki";

const lineNumberTransformer: ShikiTransformer = {
  name: "line-numbers",
  line(node, line) {
    node.children.unshift({
      type: "element",
      tagName: "span",
      properties: {
        className: [
          "inline-block",
          "min-w-10",
          "mr-4",
          "text-right",
          "select-none",
          "text-muted-foreground",
        ],
      },
      children: [{ type: "text", value: String(line) }],
    });
  },
};

const html = await codeToHtml(code, {
  lang: "typescript",
  theme: "one-dark-pro",
  transformers: [lineNumberTransformer],
});
```

---

## References

- [Shiki Documentation](https://shiki.style/)
- [Shiki Languages](https://shiki.style/languages)
- [Shiki Themes](https://shiki.style/themes)
