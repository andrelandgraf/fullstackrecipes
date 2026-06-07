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
  getSkillsInstallCommandForSlugs,
  isSkillRecipe,
  type Cookbook,
  type Recipe,
} from "../src/lib/recipes/data";

const SKILLS_DIR = path.join(process.cwd(), "skills");
const AUTHORED_SKILLS_DIR = path.join(process.cwd(), ".agents", "skills");
const BASE_URL = "https://fullstackrecipes.com/api/recipes";

function getCurlCommand(slug: string): string {
  return `curl -H "Accept: text/markdown" ${BASE_URL}/${slug}`;
}

function generateRecipeSection(recipe: Recipe): string {
  // Skill recipes are installed via the skills CLI so the agent retains their
  // day-to-day patterns; setup recipes are fetched once as markdown.
  const command = isSkillRecipe(recipe)
    ? getSkillsInstallCommandForSlugs([recipe.slug])
    : getCurlCommand(recipe.slug);

  return `### ${recipe.title}

${recipe.description}

\`\`\`bash
${command}
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

/**
 * Read the authored skill content for a skill-type recipe. Skills are authored
 * under .agents/skills/<slug>/SKILL.md and published verbatim into skills/.
 */
async function readAuthoredSkill(slug: string): Promise<string> {
  const filePath = path.join(AUTHORED_SKILLS_DIR, slug, "SKILL.md");
  const content = await fs.readFile(filePath, "utf-8");
  return content.trimEnd() + "\n";
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

  // Skill-type recipes are published verbatim from their authored source,
  // regardless of cookbook membership, so `bunx skills add -s <slug>` resolves.
  const skillRecipes = allRecipes.filter(isSkillRecipe);

  // Setup recipes not part of any cookbook get a thin standalone stub.
  const standaloneSetupRecipes = allRecipes.filter(
    (recipe) => !recipesInCookbooks.has(recipe.slug) && !isSkillRecipe(recipe),
  );

  // Clean and recreate skills directory
  await fs.rm(SKILLS_DIR, { recursive: true, force: true });
  await fs.mkdir(SKILLS_DIR, { recursive: true });

  const totalSkills =
    cookbooks.length + skillRecipes.length + standaloneSetupRecipes.length;
  console.log(
    `Building ${totalSkills} skills (${cookbooks.length} cookbooks, ${skillRecipes.length} authored skills, ${standaloneSetupRecipes.length} standalone setup recipes)...`,
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

  // Publish authored skills verbatim from .agents/skills
  console.log("\nSkills:");
  for (const recipe of skillRecipes) {
    const skillDir = path.join(SKILLS_DIR, recipe.slug);
    const skillFile = path.join(skillDir, "SKILL.md");

    await fs.mkdir(skillDir, { recursive: true });
    await fs.writeFile(
      skillFile,
      await readAuthoredSkill(recipe.slug),
      "utf-8",
    );

    console.log(`  ${recipe.slug}`);
  }

  // Generate standalone setup recipe skills (thin curl stubs)
  console.log("\nStandalone setup recipes:");
  for (const recipe of standaloneSetupRecipes) {
    const skillDir = path.join(SKILLS_DIR, recipe.slug);
    const skillFile = path.join(skillDir, "SKILL.md");

    await fs.mkdir(skillDir, { recursive: true });
    await fs.writeFile(
      skillFile,
      generateStandaloneRecipeSkill(recipe),
      "utf-8",
    );

    console.log(`  ${recipe.slug}`);
  }

  console.log(`\nDone! Generated ${totalSkills} skills in ${SKILLS_DIR}`);
}

buildSkills().catch((err) => {
  console.error("Failed to build skills:", err);
  process.exit(1);
});
