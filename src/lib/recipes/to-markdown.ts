import Markdoc, { type Node } from "@markdoc/markdoc";
import { promises as fs } from "fs";
import path from "path";

type RegistryItemJson = {
  name: string;
  title: string;
  description: string;
  dependencies?: string[];
  files: Array<{
    path: string;
    content: string;
    target: string;
  }>;
};

/**
 * Get the markdown representation of registry items.
 * Expands the {% registry %} tag into CLI command + source code.
 */
async function getRegistryMarkdown(itemNames: string[]): Promise<string> {
  const sections: string[] = [];

  const urls = itemNames
    .map((name) => `https://fullstackrecipes.com/r/${name}.json`)
    .join(" ");
  const command = `bunx --bun shadcn@latest add ${urls}`;

  sections.push(
    `**Install via shadcn registry:**\n\n\`\`\`bash\n${command}\n\`\`\``,
  );

  for (const name of itemNames) {
    try {
      const filePath = path.join(process.cwd(), "public", "r", `${name}.json`);
      const content = await fs.readFile(filePath, "utf-8");
      const data = JSON.parse(content) as RegistryItemJson;

      if (data.files && data.files.length > 0) {
        sections.push(`\n**Or copy the source code:**`);
        for (const file of data.files) {
          if (file.content) {
            const ext = file.path.split(".").pop() ?? "ts";
            const langMap: Record<string, string> = {
              ts: "typescript",
              tsx: "tsx",
              js: "javascript",
              jsx: "jsx",
            };
            const lang = langMap[ext] ?? ext;
            sections.push(
              `\n\`${file.target}\`:\n\n\`\`\`${lang}\n${file.content.trim()}\n\`\`\``,
            );
          }
        }
      }
    } catch {
      // Registry file not found, skip
    }
  }

  return sections.join("\n");
}

/**
 * Convert a Markdoc AST node to plain markdown.
 * Handles custom tags by expanding them to their markdown equivalents.
 */
async function nodeToMarkdown(node: Node): Promise<string> {
  const { type, attributes, children } = node;

  // Process children recursively
  const childrenMd = await Promise.all(
    (children ?? []).map((child) => nodeToMarkdown(child)),
  );
  const childContent = childrenMd.join("");

  switch (type) {
    case "document":
      return childContent;

    case "heading": {
      const level = attributes?.level ?? 1;
      const prefix = "#".repeat(level as number);
      return `${prefix} ${childContent.trim()}\n\n`;
    }

    case "paragraph":
      return `${childContent.trim()}\n\n`;

    case "text":
      return attributes?.content ?? "";

    case "strong":
      return `**${childContent}**`;

    case "em":
      return `*${childContent}*`;

    case "code":
      return `\`${attributes?.content ?? childContent}\``;

    case "fence": {
      const lang = attributes?.language ?? "";
      const content = attributes?.content ?? "";
      return `\`\`\`${lang}\n${content.trim()}\n\`\`\`\n\n`;
    }

    case "link": {
      const href = attributes?.href ?? "";
      return `[${childContent}](${href})`;
    }

    case "list": {
      const ordered = attributes?.ordered ?? false;
      const items = await Promise.all(
        (children ?? []).map(async (item, index) => {
          const itemContent = await nodeToMarkdown(item);
          const prefix = ordered ? `${index + 1}. ` : "- ";
          return `${prefix}${itemContent.trim()}`;
        }),
      );
      return items.join("\n") + "\n\n";
    }

    case "item":
      return childContent;

    case "blockquote":
      return (
        childContent
          .trim()
          .split("\n")
          .map((line) => `> ${line}`)
          .join("\n") + "\n\n"
      );

    case "hr":
      return "---\n\n";

    case "softbreak":
      return "\n";

    case "hardbreak":
      return "\n\n";

    case "image": {
      const src = attributes?.src ?? "";
      const alt = attributes?.alt ?? "";
      return `![${alt}](${src})`;
    }

    case "table": {
      // Tables are complex, render as-is with children
      return childContent + "\n";
    }

    case "thead":
    case "tbody":
      return childContent;

    case "tr": {
      const cells = await Promise.all(
        (children ?? []).map((cell) => nodeToMarkdown(cell)),
      );
      return `| ${cells.map((c) => c.trim()).join(" | ")} |\n`;
    }

    case "th":
    case "td":
      return childContent;

    case "tag": {
      const tagName = node.tag;

      if (tagName === "registry") {
        const items = (attributes?.items ?? "") as string;
        const itemNames = items
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        if (itemNames.length > 0) {
          return (await getRegistryMarkdown(itemNames)) + "\n\n";
        }
      }

      // Unknown tag, return children as-is
      return childContent;
    }

    default:
      // For unknown node types, just return children
      return childContent;
  }
}

/**
 * Transforms Markdoc content to plain markdown suitable for agents.
 * Expands custom tags (like {% registry %}) to their full markdown representation.
 */
export async function toMarkdown(markdocContent: string): Promise<string> {
  const ast = Markdoc.parse(markdocContent);
  const markdown = await nodeToMarkdown(ast);

  // Clean up extra whitespace
  return markdown.replace(/\n{3,}/g, "\n\n").trim();
}
