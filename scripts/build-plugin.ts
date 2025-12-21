/**
 * Build script for Full Stack Recipes Claude Code plugins.
 *
 * This script generates:
 * 1. A base "fullstackrecipes" plugin with the architect meta-skill
 * 2. One plugin per cookbook with only the skills from that cookbook
 *
 * Each plugin includes:
 * - skills/<skill-slug>/SKILL.md
 * - .mcp.json (points to hosted MCP server)
 * - .claude-plugin/plugin.json
 * - README.md
 *
 * The source of truth remains in docs/recipes/ and src/lib/recipes/data.tsx.
 */

import fs from "fs/promises";
import path from "path";
import {
  items,
  isCookbook,
  type Recipe,
  type Cookbook,
} from "../src/lib/recipes/data";

const PLUGINS_DIR = path.join(process.cwd(), "claude-code-plugins");
const RECIPES_DIR = path.join(process.cwd(), "docs", "recipes");

/** The architect skill is the standalone meta-skill for the base plugin */
const ARCHITECT_SLUG = "architect";

/** Get all cookbooks */
function getCookbooks(): Cookbook[] {
  return items.filter((item): item is Cookbook => isCookbook(item));
}

/** Get skill recipes included in a cookbook */
function getCookbookSkills(cookbook: Cookbook): Recipe[] {
  return cookbook.recipes
    .map((slug) => items.find((item) => item.slug === slug))
    .filter(
      (item): item is Recipe =>
        item !== undefined && !isCookbook(item) && item.tags.includes("Skills"),
    );
}

/** Read recipe markdown content */
async function readRecipeContent(slug: string): Promise<string> {
  const filePath = path.join(RECIPES_DIR, `${slug}.md`);
  return fs.readFile(filePath, "utf-8");
}

/** Create a SKILL.md file from a recipe */
async function createSkillFile(
  recipe: Recipe,
  skillsDir: string,
): Promise<void> {
  const skillDir = path.join(skillsDir, recipe.slug);
  await fs.mkdir(skillDir, { recursive: true });

  const content = await readRecipeContent(recipe.slug);

  const skillContent = `---
description: ${recipe.description}
---

# ${recipe.title}

${content}`;

  const skillPath = path.join(skillDir, "SKILL.md");
  await fs.writeFile(skillPath, skillContent, "utf-8");
}

/** Create .mcp.json config pointing to hosted MCP server */
async function createMcpConfig(pluginDir: string): Promise<void> {
  const mcpConfig = {
    mcpServers: {
      fullstackrecipes: {
        url: "https://fullstackrecipes.com/api/mcp",
      },
    },
  };

  const mcpPath = path.join(pluginDir, ".mcp.json");
  await fs.writeFile(mcpPath, JSON.stringify(mcpConfig, null, 2), "utf-8");
}

/** Create .claude-plugin/plugin.json */
async function createPluginJson(
  pluginDir: string,
  cookbook: Cookbook,
): Promise<void> {
  const claudePluginDir = path.join(pluginDir, ".claude-plugin");
  await fs.mkdir(claudePluginDir, { recursive: true });

  const pluginJson = {
    name: cookbook.slug,
    description: `Full Stack Recipes: ${cookbook.description}`,
    version: "1.0.0",
    author: {
      name: "Andre Landgraf",
      email: "andre.timo.landgraf@gmail.com",
    },
    homepage: `https://fullstackrecipes.com/recipes/${cookbook.slug}`,
    repository: "https://github.com/andrelandgraf/fullstackrecipes",
    license: "MIT",
  };

  const pluginPath = path.join(claudePluginDir, "plugin.json");
  await fs.writeFile(pluginPath, JSON.stringify(pluginJson, null, 2), "utf-8");
}

/** Create a README for the plugin */
async function createReadme(
  pluginDir: string,
  cookbook: Cookbook,
  skills: Recipe[],
): Promise<void> {
  const skillsList =
    skills.length > 0
      ? skills.map((r) => `- **${r.title}**: ${r.description}`).join("\n")
      : "This cookbook focuses on setup instructions. Use the MCP server to access all recipes.";

  const readme = `# ${cookbook.title}

${cookbook.description}

## Skills

${skillsList}

## MCP Resources

All recipes from this cookbook are available as MCP resources via the fullstackrecipes server.

## Installation

### From Marketplace

\`\`\`bash
/plugin marketplace add andrelandgraf/fullstackrecipes
/plugin install fullstackrecipes@${cookbook.slug}
\`\`\`

### Local Development

\`\`\`bash
claude --plugin-dir ./claude-code-plugins/${cookbook.slug}
\`\`\`

## Learn More

Visit [fullstackrecipes.com/recipes/${cookbook.slug}](https://fullstackrecipes.com/recipes/${cookbook.slug}) for full documentation.
`;

  const readmePath = path.join(pluginDir, "README.md");
  await fs.writeFile(readmePath, readme, "utf-8");
}

/** Build a single cookbook plugin */
async function buildCookbookPlugin(cookbook: Cookbook): Promise<void> {
  const pluginDir = path.join(PLUGINS_DIR, cookbook.slug);
  const skillsDir = path.join(pluginDir, "skills");

  // Create plugin directory
  await fs.mkdir(skillsDir, { recursive: true });

  // Get skills for this cookbook
  const skills = getCookbookSkills(cookbook);

  // Create skill files
  for (const skill of skills) {
    await createSkillFile(skill, skillsDir);
  }

  // Create plugin files
  await createMcpConfig(pluginDir);
  await createPluginJson(pluginDir, cookbook);
  await createReadme(pluginDir, cookbook, skills);

  console.log(
    `Built plugin: ${cookbook.slug} (${skills.length} skill${skills.length !== 1 ? "s" : ""})`,
  );
}

/** Build the base fullstackrecipes plugin with the architect skill */
async function buildBasePlugin(): Promise<void> {
  const pluginDir = path.join(PLUGINS_DIR, "fullstackrecipes");
  const skillsDir = path.join(pluginDir, "skills");

  // Create plugin directory
  await fs.mkdir(skillsDir, { recursive: true });

  // Get the architect skill
  const architectSkill = items.find(
    (item) => item.slug === ARCHITECT_SLUG && !isCookbook(item),
  ) as Recipe | undefined;

  if (!architectSkill) {
    console.warn("Warning: architect skill not found, skipping base plugin");
    return;
  }

  // Create skill file
  await createSkillFile(architectSkill, skillsDir);

  // Create MCP config
  await createMcpConfig(pluginDir);

  // Create plugin.json
  const claudePluginDir = path.join(pluginDir, ".claude-plugin");
  await fs.mkdir(claudePluginDir, { recursive: true });

  const pluginJson = {
    name: "fullstackrecipes",
    description:
      "Full Stack Recipes: Instructions for AI agents. Atomic setup guides and skills for auth, database, payments, and more.",
    version: "1.0.0",
    author: {
      name: "Andre Landgraf",
      email: "andre.timo.landgraf@gmail.com",
    },
    homepage: "https://fullstackrecipes.com",
    repository: "https://github.com/andrelandgraf/fullstackrecipes",
    license: "MIT",
  };

  await fs.writeFile(
    path.join(claudePluginDir, "plugin.json"),
    JSON.stringify(pluginJson, null, 2),
    "utf-8",
  );

  // Create README
  const readme = `# Full Stack Recipes

Instructions for AI agents. Atomic setup guides and skills for auth, database, payments, and more.

## Skills

- **${architectSkill.title}**: ${architectSkill.description}

## MCP Resources

All recipes and cookbooks are available as MCP resources via the fullstackrecipes server:

- Setup instructions for configuring tools and services
- Cookbooks that bundle related recipes together
- Code patterns and best practices

## Installation

### From Marketplace

\`\`\`bash
/plugin marketplace add andrelandgraf/fullstackrecipes
/plugin install fullstackrecipes@fullstackrecipes
\`\`\`

### Local Development

\`\`\`bash
claude --plugin-dir ./claude-code-plugins/fullstackrecipes
\`\`\`

## Learn More

Visit [fullstackrecipes.com](https://fullstackrecipes.com) for the full documentation.
`;

  await fs.writeFile(path.join(pluginDir, "README.md"), readme, "utf-8");

  console.log(
    "Built plugin: fullstackrecipes (base plugin with architect skill)",
  );
}

async function main() {
  console.log("Building Full Stack Recipes plugins...\n");

  // Clean and recreate plugins directory
  await fs.rm(PLUGINS_DIR, { recursive: true, force: true });
  await fs.mkdir(PLUGINS_DIR, { recursive: true });

  // Build the base plugin first
  await buildBasePlugin();

  // Build a plugin for each cookbook
  const cookbooks = getCookbooks();
  console.log(`\nFound ${cookbooks.length} cookbooks\n`);

  for (const cookbook of cookbooks) {
    await buildCookbookPlugin(cookbook);
  }

  console.log("\nPlugin build complete!");
  console.log(`Output: ${PLUGINS_DIR}`);
}

main().catch((error) => {
  console.error("Build failed:", error);
  process.exit(1);
});
