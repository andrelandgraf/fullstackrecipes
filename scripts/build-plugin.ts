/**
 * Build script for the Full Stack Recipes Claude Code plugin.
 *
 * This script generates the plugin structure from the source files:
 * - Skills from "Skills" tagged recipes → skills/<slug>/SKILL.md
 * - MCP server config → .mcp.json (points to hosted MCP server)
 *
 * The source of truth remains in docs/recipes/ and src/lib/recipes/data.tsx.
 */

import fs from "fs/promises";
import path from "path";
import { items, isCookbook, type Recipe } from "../src/lib/recipes/data";

const PLUGIN_DIR = path.join(process.cwd(), "fullstackrecipes-plugin");
const SKILLS_DIR = path.join(PLUGIN_DIR, "skills");
const RECIPES_DIR = path.join(process.cwd(), "docs", "recipes");

/** Recipes tagged as "Skills" that should become plugin skills */
function getSkillRecipes(): Recipe[] {
  return items.filter(
    (item): item is Recipe => !isCookbook(item) && item.tags.includes("Skills"),
  );
}

/** Read recipe markdown content */
async function readRecipeContent(slug: string): Promise<string> {
  const filePath = path.join(RECIPES_DIR, `${slug}.md`);
  return fs.readFile(filePath, "utf-8");
}

/** Create a SKILL.md file from a recipe */
async function createSkillFile(recipe: Recipe): Promise<void> {
  const skillDir = path.join(SKILLS_DIR, recipe.slug);
  await fs.mkdir(skillDir, { recursive: true });

  const content = await readRecipeContent(recipe.slug);

  // Format as SKILL.md with frontmatter describing the skill
  const skillContent = `---
description: ${recipe.description}
---

# ${recipe.title}

${content}`;

  const skillPath = path.join(skillDir, "SKILL.md");
  await fs.writeFile(skillPath, skillContent, "utf-8");
  console.log(`Created skill: ${recipe.slug}`);
}

/** Create .mcp.json config pointing to hosted MCP server */
async function createMcpConfig(): Promise<void> {
  const mcpConfig = {
    mcpServers: {
      fullstackrecipes: {
        url: "https://fullstackrecipes.com/api/mcp",
      },
    },
  };

  const mcpPath = path.join(PLUGIN_DIR, ".mcp.json");
  await fs.writeFile(mcpPath, JSON.stringify(mcpConfig, null, 2), "utf-8");
  console.log("Created .mcp.json");
}

/** Create a README for the plugin */
async function createReadme(): Promise<void> {
  const skillRecipes = getSkillRecipes();

  const readme = `# Full Stack Recipes Plugin

Instructions for AI agents. Atomic setup guides and skills for auth, database, payments, and more.

## Features

### Skills

Skills are automatically available to Claude for relevant tasks:

${skillRecipes.map((r) => `- **${r.title}**: ${r.description}`).join("\n")}

### MCP Resources

All recipes and cookbooks are available as MCP resources:

- Setup instructions for configuring tools and services
- Cookbooks that bundle related recipes together
- Code patterns and best practices

## Installation

### From Marketplace

Add the marketplace and install the plugin:

\`\`\`bash
/plugin marketplace add andrelandgraf/fullstackrecipes
/plugin install fullstackrecipes@fullstackrecipes
\`\`\`

### Local Development

Load the plugin directly from a local path:

\`\`\`bash
claude --plugin-dir ./fullstackrecipes-plugin
\`\`\`

## Learn More

Visit [fullstackrecipes.com](https://fullstackrecipes.com) for the full documentation.
`;

  const readmePath = path.join(PLUGIN_DIR, "README.md");
  await fs.writeFile(readmePath, readme, "utf-8");
  console.log("Created README.md");
}

async function main() {
  console.log("Building Full Stack Recipes plugin...\n");

  // Clean and recreate skills directory
  await fs.rm(SKILLS_DIR, { recursive: true, force: true });
  await fs.mkdir(SKILLS_DIR, { recursive: true });

  // Create skill files
  const skillRecipes = getSkillRecipes();
  console.log(`Found ${skillRecipes.length} skill recipes\n`);

  for (const recipe of skillRecipes) {
    await createSkillFile(recipe);
  }

  // Create MCP config
  console.log("");
  await createMcpConfig();

  // Create README
  await createReadme();

  console.log("\nPlugin build complete!");
  console.log(`Output: ${PLUGIN_DIR}`);
}

main().catch((error) => {
  console.error("Build failed:", error);
  process.exit(1);
});
