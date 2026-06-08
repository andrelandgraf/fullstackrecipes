#!/usr/bin/env bun
/**
 * Create a Neon database branch for testing
 *
 * Usage:
 *   bun run scripts/tests/create-branch.ts
 *   bun run scripts/tests/create-branch.ts --name="test-branch-name"
 *
 * The branch is created with:
 * - Schema-only (no data from parent, schema already applied)
 * - 1 hour TTL (auto-deletes after expiration)
 * - A read-write compute endpoint with auto-suspend
 *
 * Returns the connection string for the new branch.
 */

import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { neonConfig } from "./config";

// ANSI colors
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;

// Custom error for branch already exists
export class BranchAlreadyExistsError extends Error {
  constructor(branchName: string) {
    super(`Branch "${branchName}" already exists`);
    this.name = "BranchAlreadyExistsError";
  }
}

// Parse CLI args
function parseArgs(): { name?: string; ttlHours?: number } {
  const args = process.argv.slice(2);
  const result: { name?: string; ttlHours?: number } = {};

  for (const arg of args) {
    if (arg.startsWith("--name=")) {
      result.name = arg.split("=")[1];
    }
    if (arg.startsWith("--ttl=")) {
      result.ttlHours = parseInt(arg.split("=")[1], 10);
    }
  }

  return result;
}

type NeonBranchResponse = {
  branch: {
    id: string;
    name: string;
    project_id: string;
    parent_id: string;
    created_at: string;
  };
  endpoints: Array<{
    id: string;
    host: string;
    branch_id: string;
  }>;
  connection_uris: Array<{
    connection_uri: string;
    connection_parameters: {
      database: string;
      role: string;
      host: string;
      pooler_host: string;
    };
  }>;
};

export async function createBranch(
  branchName?: string,
  ttlHours: number = 1,
): Promise<{
  branchId: string;
  branchName: string;
  connectionString: string;
}> {
  const { apiKey, projectId } = neonConfig.server;

  const name = branchName || `test-${Date.now()}`;

  // Calculate expiration timestamp (TTL)
  const expiresAt = new Date(
    Date.now() + ttlHours * 60 * 60 * 1000,
  ).toISOString();

  console.log(bold("\nCreating Neon test branch...\n"));
  console.log(dim(`  Project ID: ${projectId}`));
  console.log(dim(`  Branch name: ${name}`));
  console.log(dim(`  TTL: ${ttlHours} hour(s) (expires at ${expiresAt})\n`));

  const response = await fetch(
    `https://console.neon.tech/api/v2/projects/${projectId}/branches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        branch: {
          name,
          // Branch from main branch
          parent_id: "br-dark-hat-ah2oxje7",
          // Schema-only: copies schema from main without data
          init_source: "schema-only",
          // Auto-delete after TTL
          expires_at: expiresAt,
        },
        endpoints: [
          {
            type: "read_write",
            settings: {
              // Auto-suspend after 5 minutes of inactivity
              suspend_timeout_seconds: 300,
              autoscaling_limit_min_cu: 0.25,
              autoscaling_limit_max_cu: 1,
            },
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();

    // Check for branch already exists error
    if (response.status === 409 || errorText.includes("already exists")) {
      throw new BranchAlreadyExistsError(name);
    }

    throw new Error(
      `Failed to create branch: ${response.status} - ${errorText}`,
    );
  }

  const data: NeonBranchResponse = await response.json();

  // Get pooled connection string (preferred for serverless)
  const connectionUri = data.connection_uris[0];
  if (!connectionUri) {
    throw new Error("No connection URI returned from Neon API");
  }

  // Use pooler host for better connection handling
  const poolerConnectionString = connectionUri.connection_uri.replace(
    connectionUri.connection_parameters.host,
    connectionUri.connection_parameters.pooler_host,
  );

  console.log(green(`  ✓ Branch created: ${data.branch.name}`));
  console.log(dim(`    Branch ID: ${data.branch.id}`));
  console.log(dim(`    Endpoint: ${data.endpoints[0]?.host}`));
  console.log("");

  return {
    branchId: data.branch.id,
    branchName: data.branch.name,
    connectionString: poolerConnectionString,
  };
}

async function main(): Promise<void> {
  const args = parseArgs();

  try {
    const result = await createBranch(args.name, args.ttlHours);

    console.log(bold("Connection String:\n"));
    console.log(yellow(result.connectionString));
    console.log("");

    console.log(dim("Set this as DATABASE_URL for your test run:"));
    console.log(dim(`  DATABASE_URL="${result.connectionString}" bun test`));
    console.log("");

    // Output JSON for programmatic use
    if (process.env.OUTPUT_JSON === "true") {
      console.log(JSON.stringify(result, null, 2));
    }

    process.exit(0);
  } catch (error) {
    if (error instanceof BranchAlreadyExistsError) {
      console.error(red("\nBranch already exists:"));
      console.error(red(error.message));
      console.error(dim("Use a different branch name with --name=<name>"));
    } else {
      console.error(red("\nError creating branch:"));
      console.error(error instanceof Error ? error.message : error);
    }
    process.exit(1);
  }
}

// Run only if executed directly (not when imported as module)
if (import.meta.main) {
  main();
}
