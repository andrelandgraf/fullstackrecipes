#!/usr/bin/env bun
/**
 * Validate environment configuration
 *
 * Usage:
 *   bun run validate-env
 *   bun run validate-env --environment=development
 *   bun run validate-env --environment=production
 *
 * This script:
 * 1. Loads env files using Next.js's loadEnvConfig
 * 2. Finds all config.ts files in src/lib/\*\/
 * 3. Validates each config by importing it (triggers configSchema validation)
 * 4. Warns about env variables in .env files that aren't used by any config
 */

import { loadEnvConfig } from "@next/env";
import { Glob } from "bun";
import path from "path";

// ANSI colors
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;

// Parse CLI args
function parseArgs(): { environment?: string } {
  const args = process.argv.slice(2);
  const result: { environment?: string } = {};

  for (const arg of args) {
    if (arg.startsWith("--environment=")) {
      result.environment = arg.split("=")[1];
    }
  }

  return result;
}

// Track which env vars are referenced by configs
const referencedEnvVars = new Set<string>();

// Patch process.env to track access
function trackEnvAccess() {
  const originalEnv = process.env;
  const handler: ProxyHandler<NodeJS.ProcessEnv> = {
    get(target, prop) {
      if (typeof prop === "string" && !prop.startsWith("_")) {
        referencedEnvVars.add(prop);
      }
      return Reflect.get(target, prop);
    },
  };
  process.env = new Proxy(originalEnv, handler);
}

async function main() {
  const args = parseArgs();
  const projectDir = process.cwd();

  console.log(bold("\n🔍 Environment Configuration Validator\n"));

  // Set NODE_ENV if environment specified
  const environment = args.environment ?? process.env.NODE_ENV ?? "development";
  (process.env as Record<string, string>).NODE_ENV = environment;
  console.log(dim(`  Environment: ${environment}\n`));

  // Load env files
  // Second param `dev` tells loadEnvConfig to load .env.development files
  const isDev = environment === "development";
  console.log(dim("  Loading environment files..."));

  const loadedEnvFiles: string[] = [];
  const { combinedEnv, loadedEnvFiles: files } = loadEnvConfig(
    projectDir,
    isDev,
  );

  for (const file of files) {
    loadedEnvFiles.push(file.path);
    console.log(dim(`    ✓ ${path.relative(projectDir, file.path)}`));
  }

  if (loadedEnvFiles.length === 0) {
    console.log(dim("    No .env files found"));
  }

  console.log("");

  // Start tracking env access before importing configs
  trackEnvAccess();

  // Find all config.ts files
  const configGlob = new Glob("src/lib/*/config.ts");
  const configFiles: string[] = [];

  for await (const file of configGlob.scan(projectDir)) {
    configFiles.push(file);
  }

  if (configFiles.length === 0) {
    console.log(yellow("  ⚠ No config.ts files found in src/lib/*/\n"));
    process.exit(0);
  }

  console.log(dim(`  Found ${configFiles.length} config files:\n`));

  // Validate each config
  const errors: { file: string; error: Error }[] = [];
  const validated: string[] = [];

  for (const configFile of configFiles) {
    const relativePath = configFile;
    const absolutePath = path.join(projectDir, configFile);

    try {
      // Import the config module - this triggers validation
      await import(absolutePath);
      console.log(green(`  ✓ ${relativePath}`));
      validated.push(relativePath);
    } catch (error) {
      if (error instanceof Error) {
        // Check if it's a disabled feature flag (not an error)
        if (error.message.includes("isEnabled: false")) {
          console.log(dim(`  ○ ${relativePath} (feature disabled)`));
          validated.push(relativePath);
        } else {
          console.log(red(`  ✗ ${relativePath}`));
          errors.push({ file: relativePath, error });
        }
      }
    }
  }

  console.log("");

  // Report validation errors
  if (errors.length > 0) {
    console.log(red(bold("Validation Errors:\n")));

    for (const { file, error } of errors) {
      console.log(red(`  ${file}:`));
      // Extract the actual error message
      const message = error.message.split("\n").slice(0, 3).join("\n    ");
      console.log(red(`    ${message}\n`));
    }
  }

  // Find unused env variables (in .env files but not referenced by configs)
  const envVarsInFiles = new Set<string>();

  // Parse loaded env files to get all defined variables
  for (const envFile of loadedEnvFiles) {
    try {
      const content = await Bun.file(envFile).text();
      const lines = content.split("\n");

      for (const line of lines) {
        const trimmed = line.trim();
        // Skip comments and empty lines
        if (!trimmed || trimmed.startsWith("#")) continue;

        // Extract variable name (before = sign)
        const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)\s*=/);
        if (match) {
          envVarsInFiles.add(match[1]);
        }
      }
    } catch {
      // Ignore file read errors
    }
  }

  // Common system/framework vars to ignore
  const ignoredVars = new Set([
    // System
    "NODE_ENV",
    "PATH",
    "HOME",
    "USER",
    "SHELL",
    "TERM",
    "LANG",
    "PWD",
    "OLDPWD",
    "HOSTNAME",
    "LOGNAME",
    "TMPDIR",
    "XDG_CONFIG_HOME",
    "XDG_DATA_HOME",
    "XDG_CACHE_HOME",
    "CI",
    "TZ",
    // Vercel
    "VERCEL",
    "VERCEL_ENV",
    "VERCEL_URL",
    "VERCEL_REGION",
    "VERCEL_TARGET_ENV",
    "VERCEL_GIT_COMMIT_SHA",
    "VERCEL_GIT_COMMIT_MESSAGE",
    "VERCEL_GIT_COMMIT_AUTHOR_LOGIN",
    "VERCEL_GIT_COMMIT_AUTHOR_NAME",
    "VERCEL_GIT_PREVIOUS_SHA",
    "VERCEL_GIT_PROVIDER",
    "VERCEL_GIT_REPO_ID",
    "VERCEL_GIT_REPO_OWNER",
    "VERCEL_GIT_REPO_SLUG",
    "VERCEL_GIT_COMMIT_REF",
    "VERCEL_GIT_PULL_REQUEST_ID",
    // Build tools (Turbo, NX)
    "TURBO_CACHE",
    "TURBO_REMOTE_ONLY",
    "TURBO_RUN_SUMMARY",
    "TURBO_DOWNLOAD_LOCAL_ENABLED",
    "NX_DAEMON",
  ]);

  // Find vars in .env files but not referenced by configs
  const unusedVars: { name: string; files: string[] }[] = [];

  for (const envVar of envVarsInFiles) {
    if (ignoredVars.has(envVar)) continue;
    if (referencedEnvVars.has(envVar)) continue;

    // Find which files define this var
    const definingFiles: string[] = [];
    for (const envFile of loadedEnvFiles) {
      try {
        const content = await Bun.file(envFile).text();
        if (new RegExp(`^${envVar}\\s*=`, "m").test(content)) {
          definingFiles.push(path.relative(projectDir, envFile));
        }
      } catch {
        // Ignore
      }
    }

    if (definingFiles.length > 0) {
      unusedVars.push({ name: envVar, files: definingFiles });
    }
  }

  // Report unused vars
  if (unusedVars.length > 0) {
    console.log(yellow(bold("Unused Environment Variables:\n")));
    console.log(
      dim(
        "  These variables are defined in .env files but not used by any config:\n",
      ),
    );

    for (const { name, files } of unusedVars.sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      console.log(yellow(`  ⚠ ${name}`));
      console.log(dim(`    defined in: ${files.join(", ")}`));
    }

    console.log("");
  }

  // Summary
  console.log(bold("Summary:\n"));
  console.log(`  Configs validated: ${green(String(validated.length))}`);
  console.log(
    `  Validation errors: ${errors.length > 0 ? red(String(errors.length)) : green("0")}`,
  );
  console.log(
    `  Unused env vars:   ${unusedVars.length > 0 ? yellow(String(unusedVars.length)) : green("0")}`,
  );
  console.log("");

  // Exit with error code if validation failed
  if (errors.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(red("Unexpected error:"), error);
  process.exit(1);
});
