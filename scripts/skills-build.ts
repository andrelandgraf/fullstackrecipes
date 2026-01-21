/**
 * Build script that generates SKILL.md files.
 *
 * Generates:
 * - One skill per cookbook (includes all prerequisites and recipes with curl commands)
 * - One skill per standalone recipe (recipes not part of any cookbook)
 *
 * Usage: bun run scripts/skills-build.ts
 */
import fs from "fs/promises";
import path from "path";
import {
  getAllCookbooks,
  getAllRecipes,
  getRequiredItems,
  type Cookbook,
  type Recipe,
} from "../src/lib/recipes/data";

const SKILLS_DIR = path.join(process.cwd(), "skills");
const BASE_URL = "https://fullstackrecipes.com/api/recipes";

function getCurlCommand(slug: string): string {
  return `curl -H "Accept: text/markdown" ${BASE_URL}/${slug}`;
}

function generateRecipeSection(recipe: Recipe): string {
  return `### ${recipe.title}

${recipe.description}

\`\`\`bash
${getCurlCommand(recipe.slug)}
\`\`\``;
}

function collectAllPrerequisites(
  item: Recipe | Cookbook,
  visited = new Set<string>(),
): (Recipe | Cookbook)[] {
  const result: (Recipe | Cookbook)[] = [];
  const required = getRequiredItems(item);

  for (const req of required) {
    if (visited.has(req.slug)) continue;
    visited.add(req.slug);

    // Recursively get prerequisites of prerequisites
    const nestedPrereqs = collectAllPrerequisites(req, visited);
    result.push(...nestedPrereqs);
    result.push(req);
  }

  return result;
}

function generateCookbookSkill(cookbook: Cookbook, recipes: Recipe[]): string {
  const prerequisites = collectAllPrerequisites(cookbook);

  const frontmatter = `---
name: ${cookbook.slug}
description: ${cookbook.description}
---`;

  let content = `${frontmatter}

# ${cookbook.title}

${cookbook.description}

`;

  // Add prerequisites section if any
  if (prerequisites.length > 0) {
    content += `## Prerequisites

Complete these recipes first (in order):

`;
    for (const prereq of prerequisites) {
      content += generateRecipeSection(prereq as Recipe) + "\n\n";
    }
  }

  // Add included recipes section
  content += `## Cookbook - Complete These Recipes in Order

`;
  for (const recipe of recipes) {
    content += generateRecipeSection(recipe) + "\n\n";
  }

  return content.trim() + "\n";
}

function generateStandaloneRecipeSkill(recipe: Recipe): string {
  const frontmatter = `---
name: ${recipe.slug}
description: ${recipe.description}
---`;

  return `${frontmatter}

# ${recipe.title}

${recipe.description}

\`\`\`bash
${getCurlCommand(recipe.slug)}
\`\`\`
`;
}

async function buildSkills() {
  const cookbooks = getAllCookbooks();
  const allRecipes = getAllRecipes();

  // Find all recipe slugs that are part of cookbooks
  const recipesInCookbooks = new Set<string>();
  for (const cookbook of cookbooks) {
    for (const slug of cookbook.recipes) {
      recipesInCookbooks.add(slug);
    }
  }

  // Standalone recipes are those not part of any cookbook
  const standaloneRecipes = allRecipes.filter(
    (recipe) => !recipesInCookbooks.has(recipe.slug),
  );

  // Clean and recreate skills directory
  await fs.rm(SKILLS_DIR, { recursive: true, force: true });
  await fs.mkdir(SKILLS_DIR, { recursive: true });

  const totalSkills = cookbooks.length + standaloneRecipes.length;
  console.log(
    `Building ${totalSkills} skills (${cookbooks.length} cookbooks, ${standaloneRecipes.length} standalone recipes)...`,
  );

  // Generate cookbook skills
  console.log("\nCookbooks:");
  for (const cookbook of cookbooks) {
    const skillDir = path.join(SKILLS_DIR, cookbook.slug);
    const skillFile = path.join(skillDir, "SKILL.md");

    await fs.mkdir(skillDir, { recursive: true });

    // Get recipes included in this cookbook
    const includedRecipes = cookbook.recipes
      .map((slug) => allRecipes.find((r) => r.slug === slug))
      .filter((r): r is Recipe => r !== undefined);

    const content = generateCookbookSkill(cookbook, includedRecipes);
    await fs.writeFile(skillFile, content, "utf-8");

    console.log(`  ${cookbook.slug} (${includedRecipes.length} recipes)`);
  }

  // Generate standalone recipe skills
  console.log("\nStandalone recipes:");
  for (const recipe of standaloneRecipes) {
    const skillDir = path.join(SKILLS_DIR, recipe.slug);
    const skillFile = path.join(skillDir, "SKILL.md");

    await fs.mkdir(skillDir, { recursive: true });

    const content = generateStandaloneRecipeSkill(recipe);
    await fs.writeFile(skillFile, content, "utf-8");

    console.log(`  ${recipe.slug}`);
  }

  console.log(`\nDone! Generated ${totalSkills} skills in ${SKILLS_DIR}`);
}

buildSkills().catch((err) => {
  console.error("Failed to build skills:", err);
  process.exit(1);
});
