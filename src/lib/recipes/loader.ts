import fs from "fs/promises";
import path from "path";
import type { Recipe, Cookbook } from "./data";
import { toMarkdown } from "./to-markdown";

/** Load raw Markdoc content (includes custom tags like {% registry %}) */
export async function loadRecipeContent(
  item: Recipe | Cookbook,
): Promise<string> {
  const sectionsDir = path.join(process.cwd(), "docs", "sections");
  const contents = await Promise.all(
    item.sections.map(async (section) => {
      const filePath = path.join(sectionsDir, section);
      return fs.readFile(filePath, "utf-8");
    }),
  );
  return contents.join("\n\n---\n\n");
}

/**
 * Load recipe content transformed to plain markdown.
 * Custom tags are expanded to their full markdown representation.
 * Use this for MCP server, copy buttons, and agent consumption.
 */
export async function loadRecipeMarkdown(
  item: Recipe | Cookbook,
): Promise<string> {
  const rawContent = await loadRecipeContent(item);
  return toMarkdown(rawContent);
}
