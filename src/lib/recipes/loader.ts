import fs from "fs/promises";
import path from "path";
import {
  isCookbook,
  isSkillRecipe,
  getRecipeBySlug,
  getCookbookRecipes,
  getRequiredItems,
  getSkillsInstallCommandForSlugs,
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
    // Cookbooks combine their recipes in order. Setup recipes inline their full
    // content; skill recipes render as a compact install section (title,
    // motivation, install command) so the cookbook ends up installing them as
    // skills rather than re-teaching their content.
    const contents = await Promise.all(
      item.recipes.map(async (slug) => {
        const recipe = getRecipeBySlug(slug);
        if (!recipe) {
          throw new Error(`Recipe not found: ${slug}`);
        }
        if (isSkillRecipe(recipe)) {
          const command = getSkillsInstallCommandForSlugs([slug]);
          return `## ${recipe.title}\n\n${recipe.description}\n\nInstall this skill so your agent retains these patterns for day-to-day work:\n\n\`\`\`bash\n${command}\n\`\`\``;
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
 * Build the prerequisites section from an item's `requires` metadata.
 * Returns an empty string when the item has no prerequisites.
 */
function getPrerequisitesSection(item: Recipe | Cookbook): string {
  const requiredItems = getRequiredItems(item);
  if (requiredItems.length === 0) {
    return "";
  }
  const list = requiredItems.map((r) => `- ${r.title}`).join("\n");
  return `## Prerequisites\n\nComplete these setup recipes first:\n\n${list}\n\n`;
}

/**
 * Load recipe content transformed to plain markdown.
 * Custom tags are expanded to their full markdown representation.
 * Use this for MCP server, copy buttons, and agent consumption.
 * Prepends title, description, and prerequisites for standalone markdown output.
 */
export async function loadRecipeMarkdown(
  item: Recipe | Cookbook,
): Promise<string> {
  const rawContent = await loadRecipeContent(item);
  const expandedContent = await toMarkdown(rawContent);

  // Prepend title, description, and prerequisites for markdown output
  // (not needed for HTML rendering since the page displays these separately)
  const header = `# ${item.title}\n\n${item.description}\n\n`;
  const prerequisites = getPrerequisitesSection(item);
  return header + prerequisites + expandedContent;
}
