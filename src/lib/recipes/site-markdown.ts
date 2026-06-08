import fs from "fs/promises";
import path from "path";
import {
  getAllCookbooks,
  getAllRecipes,
  getRegistryItems,
  type Recipe,
  type Cookbook,
} from "@/lib/recipes/data";

const SITE_URL = "https://fullstackrecipes.com";

const DOCS_DIR = path.join(process.cwd(), "docs");

const FETCH_INSTRUCTIONS = `## Fetch recipes as Markdown

Every page on the site has a Markdown twin. Append \`.md\` to any URL to get the
raw content for your coding agent — no MCP server required.

\`\`\`bash
# This index
curl ${SITE_URL}/llms.txt

# Any recipe or cookbook (use the slugs listed below)
curl ${SITE_URL}/recipes/<slug>.md

# This landing page as Markdown
curl ${SITE_URL}/index.md
\`\`\``;

function itemList(items: (Recipe | Cookbook)[]): string {
  return items
    .map(
      (item) =>
        `- [${item.title}](${SITE_URL}/recipes/${item.slug}.md) - ${item.description}`,
    )
    .join("\n");
}

function registryCommands(): string {
  return getRegistryItems()
    .map((item) => `bunx shadcn@latest add ${SITE_URL}/r/${item.name}.json`)
    .join("\n");
}

/**
 * Build the landing-page markdown shown at `/` (served as `/index.md` and
 * `/.md`). The authored intro lives in `docs/landing.md` so it can be edited
 * like any other doc; the recipe, cookbook, and registry listings are appended
 * from the single source of truth in `data.tsx`.
 */
export async function buildLandingMarkdown(): Promise<string> {
  const intro = await fs.readFile(path.join(DOCS_DIR, "landing.md"), "utf-8");

  return [
    intro.trim(),
    FETCH_INSTRUCTIONS,
    `## Cookbooks\n\nCookbooks are curated bundles of multiple recipes for complete feature implementations.\n\n${itemList(getAllCookbooks())}`,
    `## Recipes\n\n${itemList(getAllRecipes())}`,
    `## Shadcn Registry\n\nInstall reusable utilities directly:\n\n\`\`\`bash\n${registryCommands()}\n\`\`\``,
    `## Links\n\n- Homepage: ${SITE_URL}\n- Index: ${SITE_URL}/llms.txt`,
  ].join("\n\n---\n\n");
}
