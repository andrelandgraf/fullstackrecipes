import fs from "fs/promises";
import path from "path";
import {
  isCookbook,
  getRecipeBySlug,
  getCookbookRecipes,
  type Recipe,
  type Cookbook,
} from "./data";
import { toMarkdown } from "./to-markdown";

export type TocItem = {
  id: string;
  title: string;
  level: number;
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

/** Extract table of contents from cookbook recipes */
export function getCookbookTableOfContents(cookbook: Cookbook): TocItem[] {
  const recipes = getCookbookRecipes(cookbook);
  return recipes.map((recipe) => ({
    id: slugify(recipe.title),
    title: recipe.title,
    level: 2,
  }));
}

/** Load raw Markdoc content (includes custom tags like {% registry %}) */
export async function loadRecipeContent(
  item: Recipe | Cookbook,
): Promise<string> {
  const recipesDir = path.join(process.cwd(), "docs", "recipes");

  if (isCookbook(item)) {
    // Cookbooks combine content from all their recipes
    const contents = await Promise.all(
      item.recipes.map(async (slug) => {
        const recipe = getRecipeBySlug(slug);
        if (!recipe) {
          throw new Error(`Recipe not found: ${slug}`);
        }
        const filePath = path.join(recipesDir, `${slug}.md`);
        const content = await fs.readFile(filePath, "utf-8");
        return `## ${recipe.title}\n\n${recipe.description}\n\n${content}`;
      }),
    );
    return contents.join("\n\n---\n\n");
  }

  // Regular recipe - single file
  const filePath = path.join(recipesDir, `${item.slug}.md`);
  return fs.readFile(filePath, "utf-8");
}

/**
 * Load recipe content transformed to plain markdown.
 * Custom tags are expanded to their full markdown representation.
 * Use this for MCP server, copy buttons, and agent consumption.
 * Prepends title and description for standalone markdown output.
 */
export async function loadRecipeMarkdown(
  item: Recipe | Cookbook,
): Promise<string> {
  const rawContent = await loadRecipeContent(item);
  const expandedContent = await toMarkdown(rawContent);

  // Prepend title and description for markdown output
  // (not needed for HTML rendering since page displays these separately)
  const header = `# ${item.title}\n\n${item.description}\n\n`;
  return header + expandedContent;
}
