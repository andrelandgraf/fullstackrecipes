/**
 * Build script that generates SKILL.md files for each recipe.
 *
 * For "Skills" recipes: includes the full recipe markdown content
 * For "Setup Instructions" recipes: references the MCP resource
 *
 * Usage: bun run scripts/skills-build.ts
 */
import fs from "fs/promises";
import path from "path";
import {
  getAllRecipes,
  getItemResourceUri,
  type Recipe,
} from "../src/lib/recipes/data";
import { loadRecipeMarkdown } from "../src/lib/recipes/loader";

const SKILLS_DIR = path.join(process.cwd(), "skills");

function isSkillsRecipe(recipe: Recipe): boolean {
  return recipe.tags.includes("Skills");
}

function generateSkillFrontmatter(recipe: Recipe): string {
  return `---
name: ${recipe.slug}
description: ${recipe.description}
---`;
}

async function generateSkillContent(recipe: Recipe): Promise<string> {
  const frontmatter = generateSkillFrontmatter(recipe);

  if (isSkillsRecipe(recipe)) {
    // Skills recipes: include full markdown content
    const markdown = await loadRecipeMarkdown(recipe);
    return `${frontmatter}\n\n${markdown}`;
  }

  // Setup recipes: reference the MCP resource with curl fallback
  const resourceUri = getItemResourceUri(recipe);
  return `${frontmatter}

# ${recipe.title}

To set up ${recipe.title}, fetch the recipe from the fullstackrecipes MCP server:

**Resource URI:** \`${resourceUri}\`

If the MCP server is not configured, fetch the recipe directly:

\`\`\`bash
curl -H "Accept: text/plain" https://fullstackrecipes.com/api/recipes/${recipe.slug}
\`\`\`
`;
}

async function buildSkills() {
  const recipes = getAllRecipes();

  // Clean and recreate skills directory
  await fs.rm(SKILLS_DIR, { recursive: true, force: true });
  await fs.mkdir(SKILLS_DIR, { recursive: true });

  console.log(`Building ${recipes.length} skills...`);

  for (const recipe of recipes) {
    const skillDir = path.join(SKILLS_DIR, recipe.slug);
    const skillFile = path.join(skillDir, "SKILL.md");

    await fs.mkdir(skillDir, { recursive: true });

    const content = await generateSkillContent(recipe);
    await fs.writeFile(skillFile, content, "utf-8");

    const type = isSkillsRecipe(recipe) ? "skill" : "setup";
    console.log(`  ${recipe.slug} (${type})`);
  }

  console.log(`\nDone! Generated ${recipes.length} skills in ${SKILLS_DIR}`);
}

buildSkills().catch((err) => {
  console.error("Failed to build skills:", err);
  process.exit(1);
});
