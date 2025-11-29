import fs from "fs/promises";
import path from "path";
import type { Recipe } from "./data";

export async function loadRecipeContent(recipe: Recipe): Promise<string> {
  const sectionsDir = path.join(process.cwd(), "docs", "sections");
  const contents = await Promise.all(
    recipe.sections.map(async (section) => {
      const filePath = path.join(sectionsDir, section);
      return fs.readFile(filePath, "utf-8");
    }),
  );
  return contents.join("\n\n---\n\n");
}
