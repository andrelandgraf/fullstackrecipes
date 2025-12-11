import fs from "fs/promises";
import path from "path";
import type { Recipe, Cookbook } from "./data";

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
