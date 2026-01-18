#!/usr/bin/env bun
/**
 * Verify all user stories have correct format
 *
 * Usage: bun scripts/verify-user-stories.ts
 */
import { readdirSync, readFileSync, statSync, existsSync } from "fs";
import { join, extname } from "path";
import { z } from "zod";

const FeatureSchema = z.object({
  description: z.string().min(1),
  steps: z.array(z.string().min(1)).min(1),
  passes: z.boolean(),
});

const UserStorySchema = z.array(FeatureSchema).min(1);

const rootDir = join(import.meta.dir, "..");
const userStoriesDir = join(rootDir, "docs", "user-stories");

let hasErrors = false;

function error(msg: string) {
  console.error(`  ${msg}`);
  hasErrors = true;
}

function success(msg: string) {
  console.log(`  ${msg}`);
}

function validateDirectory(dir: string, prefix = "") {
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const entryPath = join(dir, entry);
    const stat = statSync(entryPath);

    if (stat.isDirectory()) {
      // Recursively validate subdirectories
      console.log(`${prefix}${entry}/`);
      validateDirectory(entryPath, prefix + "  ");
      continue;
    }

    // Check for non-JSON files
    if (extname(entry) !== ".json") {
      error(`${prefix}${entry} - not a .json file`);
      continue;
    }

    // Validate JSON file
    try {
      const content = readFileSync(entryPath, "utf-8");
      const json = JSON.parse(content);
      const result = UserStorySchema.safeParse(json);

      if (!result.success) {
        error(`${prefix}${entry} - invalid schema`);
        for (const issue of result.error.issues) {
          console.log(`${prefix}    ${issue.path.join(".")}: ${issue.message}`);
        }
      } else {
        const passing = result.data.filter((f) => f.passes).length;
        const total = result.data.length;
        success(`${prefix}${entry} (${passing}/${total} passing)`);
      }
    } catch (e) {
      if (e instanceof SyntaxError) {
        error(`${prefix}${entry} - invalid JSON: ${e.message}`);
      } else {
        error(`${prefix}${entry} - ${e}`);
      }
    }
  }
}

console.log(`\nVerifying user stories...\n`);

if (!existsSync(userStoriesDir)) {
  console.log("No docs/user-stories directory found\n");
  process.exit(0);
}

validateDirectory(userStoriesDir);

console.log();

if (hasErrors) {
  console.log("Verification failed\n");
  process.exit(1);
} else {
  console.log("All user stories valid\n");
  process.exit(0);
}
