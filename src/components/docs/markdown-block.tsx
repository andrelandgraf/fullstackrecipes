import Markdoc, { type RenderableTreeNode, type Tag } from "@markdoc/markdoc";
import Link from "next/link";
import { type AnchorHTMLAttributes, type ReactNode } from "react";
import { codeToHtml } from "shiki";

import { cn } from "@/lib/utils";
import { CodeBlockClient } from "./code-block-client";
import { RegistryTag } from "../recipes/registry-tag";

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

type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

function isSupportedLanguage(lang: string): lang is SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage);
}

async function highlightCode(code: string, language: SupportedLanguage) {
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

type CodeBlockProps = {
  content: string;
  language: string;
};

function normalizeLanguage(language: string): SupportedLanguage {
  if (isSupportedLanguage(language)) return language;
  if (language === "env") return "dotenv";
  return "typescript";
}

// Patterns for file path comments at the start of code blocks
// Matches: // path/to/file.tsx or # path/to/file.py or // .env.local etc.
const FILE_PATH_PATTERNS = [
  /^\/\/\s*([^\s]+\.[a-zA-Z0-9]+)\s*\n/, // // path/to/file.ext
  /^#\s*([^\s]+\.[a-zA-Z0-9]+)\s*\n/, // # path/to/file.ext (for bash, python, yaml)
];

function extractFilePath(content: string): {
  filePath: string | null;
  displayContent: string;
} {
  for (const pattern of FILE_PATH_PATTERNS) {
    const match = content.match(pattern);
    if (match?.[1]) {
      // Validate it looks like a file path (contains / or . or starts with .)
      const potentialPath = match[1];
      if (
        potentialPath.includes("/") ||
        potentialPath.startsWith(".") ||
        /^[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/.test(potentialPath)
      ) {
        return {
          filePath: potentialPath,
          displayContent: content.replace(pattern, ""),
        };
      }
    }
  }
  return { filePath: null, displayContent: content };
}

function getFileExtension(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase();
  if (!ext) return "file";

  // Handle special cases
  if (filePath.endsWith(".env") || filePath.endsWith(".env")) {
    return "env";
  }

  return ext;
}

async function CodeBlock({ content, language }: CodeBlockProps) {
  const lang = normalizeLanguage(language);
  const trimmedContent = content.trim();

  const { filePath, displayContent } = extractFilePath(trimmedContent);
  const codeToHighlight = displayContent.trim();
  const { light, dark } = await highlightCode(codeToHighlight, lang);

  const hasFilePath = !!filePath;
  const fileExt = filePath ? getFileExtension(filePath) : null;

  return (
    <CodeBlockClient
      filePath={filePath}
      fileExt={fileExt}
      language={language}
      code={codeToHighlight}
      lightHtml={light}
      darkHtml={dark}
      hasFilePath={hasFilePath}
    />
  );
}

function InlineCode({
  content,
  children,
}: {
  content?: string;
  children?: ReactNode;
}) {
  return (
    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
      {content ?? children}
    </code>
  );
}

function Heading({
  level,
  children,
}: {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children: ReactNode;
}) {
  const Tag = `h${level}` as const;
  const styles = {
    1: "text-3xl font-bold mt-8 mb-4 first:mt-0",
    2: "text-2xl font-semibold mt-6 mb-3",
    3: "text-xl font-semibold mt-5 mb-2",
    4: "text-lg font-medium mt-4 mb-2",
    5: "text-base font-medium mt-3 mb-1",
    6: "text-sm font-medium mt-3 mb-1",
  };

  return <Tag className={styles[level]}>{children}</Tag>;
}

function Paragraph({ children }: { children: ReactNode }) {
  return <p className="mb-4 leading-7 text-foreground/90">{children}</p>;
}

function Strong({ children }: { children: ReactNode }) {
  return <strong className="font-semibold">{children}</strong>;
}

function Emphasis({ children }: { children: ReactNode }) {
  return <em className="italic">{children}</em>;
}

function DocLink({
  href,
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const isExternal = href.startsWith("http");

  if (isExternal) {
    return (
      <a
        href={href}
        className="text-primary underline underline-offset-4 hover:text-primary/80"
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      >
        {children}
      </a>
    );
  }

  return (
    <Link
      href={href}
      className="text-primary underline underline-offset-4 hover:text-primary/80"
      {...props}
    >
      {children}
    </Link>
  );
}

function List({
  ordered,
  children,
}: {
  ordered: boolean;
  children: ReactNode;
}) {
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag
      className={cn(
        "mb-4 ml-6 space-y-2",
        ordered ? "list-decimal" : "list-disc",
      )}
    >
      {children}
    </Tag>
  );
}

function ListItem({ children }: { children: ReactNode }) {
  return <li className="leading-7">{children}</li>;
}

function Blockquote({ children }: { children: ReactNode }) {
  return (
    <blockquote className="border-l-4 border-primary/30 pl-4 italic text-muted-foreground my-4">
      {children}
    </blockquote>
  );
}

function HorizontalRule() {
  return <hr className="my-6 border-border" />;
}

function Table({ children }: { children: ReactNode }) {
  return (
    <div className="my-4 w-full overflow-x-auto">
      <table className="w-full border-collapse border border-border">
        {children}
      </table>
    </div>
  );
}

function TableHead({ children }: { children: ReactNode }) {
  return <thead className="bg-muted/50">{children}</thead>;
}

function TableBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

function TableRow({ children }: { children: ReactNode }) {
  return <tr className="border-b border-border">{children}</tr>;
}

function TableHeaderCell({ children }: { children: ReactNode }) {
  return (
    <th className="border border-border px-4 py-2 text-left font-semibold">
      {children}
    </th>
  );
}

function TableCell({ children }: { children: ReactNode }) {
  return <td className="border border-border px-4 py-2">{children}</td>;
}

function Image({ src, alt }: { src: string; alt?: string }) {
  return (
    <img
      src={src}
      alt={alt ?? ""}
      className="my-4 max-w-full rounded-md border"
    />
  );
}

function Article({ children }: { children: ReactNode }) {
  return <article>{children}</article>;
}

const markdocConfig = {
  nodes: {
    document: {
      render: "Article",
    },
    heading: {
      render: "Heading",
      attributes: {
        level: { type: Number, required: true },
      },
    },
    paragraph: {
      render: "Paragraph",
    },
    strong: {
      render: "Strong",
    },
    em: {
      render: "Emphasis",
    },
    link: {
      render: "DocLink",
      attributes: {
        href: { type: String, required: true },
        title: { type: String },
      },
    },
    code: {
      render: "InlineCode",
      attributes: {
        content: { type: String },
      },
    },
    fence: {
      render: "CodeBlock",
      attributes: {
        language: { type: String },
        content: { type: String },
      },
    },
    list: {
      render: "List",
      attributes: {
        ordered: { type: Boolean, default: false },
      },
    },
    item: {
      render: "ListItem",
    },
    blockquote: {
      render: "Blockquote",
    },
    hr: {
      render: "HorizontalRule",
    },
    table: {
      render: "Table",
    },
    thead: {
      render: "TableHead",
    },
    tbody: {
      render: "TableBody",
    },
    tr: {
      render: "TableRow",
    },
    th: {
      render: "TableHeaderCell",
    },
    td: {
      render: "TableCell",
    },
    image: {
      render: "Image",
      attributes: {
        src: { type: String, required: true },
        alt: { type: String },
      },
    },
  },
  tags: {
    registry: {
      render: "RegistryTag",
      selfClosing: true,
      attributes: {
        items: { type: String, required: true },
      },
    },
  },
};

const components = {
  Article,
  Heading,
  Paragraph,
  Strong,
  Emphasis,
  DocLink,
  InlineCode,
  CodeBlock,
  List,
  ListItem,
  Blockquote,
  HorizontalRule,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
  Image,
  RegistryTag,
};

function isTag(node: RenderableTreeNode): node is Tag {
  return (
    node !== null &&
    typeof node === "object" &&
    !Array.isArray(node) &&
    "$$mdtype" in node &&
    node.$$mdtype === "Tag"
  );
}

function renderNode(
  node: RenderableTreeNode,
  key?: string | number,
): ReactNode {
  if (node === null || typeof node === "undefined") {
    return null;
  }

  if (typeof node === "string" || typeof node === "number") {
    return node;
  }

  if (typeof node === "boolean") {
    return null;
  }

  if (Array.isArray(node)) {
    return node.map((child, i) => renderNode(child, i));
  }

  if (!isTag(node)) {
    return null;
  }

  const { name, attributes, children } = node;

  const renderChildren = () =>
    children?.map((child, i) => renderNode(child, i)) ?? null;

  if (!name) {
    return renderChildren();
  }

  const Component = components[name as keyof typeof components];

  if (!Component) {
    console.warn(`Unknown component: ${name}`);
    return renderChildren();
  }

  const renderedChildren = renderChildren();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (
    <Component key={key} {...(attributes as any)}>
      {renderedChildren}
    </Component>
  );
}

export type MarkdownBlockProps = {
  content: string;
  className?: string;
};

export async function MarkdownBlock({
  content,
  className,
}: MarkdownBlockProps) {
  const ast = Markdoc.parse(content);
  const transformed = Markdoc.transform(ast, markdocConfig);

  return (
    <div className={cn("prose-custom", className)}>
      {renderNode(transformed)}
    </div>
  );
}
