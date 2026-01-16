#!/usr/bin/env bun
/**
 * Run tests with a fresh Neon database branch and isolated test server
 *
 * Usage:
 *   bun run scripts/tests/test-with-branch.ts                    # Run all tests
 *   bun run scripts/tests/test-with-branch.ts --unit             # Run only unit tests (src/)
 *   bun run scripts/tests/test-with-branch.ts --integration      # Run only integration tests
 *   bun run scripts/tests/test-with-branch.ts --playwright       # Run only Playwright tests
 *   bun run scripts/tests/test-with-branch.ts -- --timeout 60000
 *
 * This script:
 * 1. Creates a schema-only branch from main (with 1hr TTL)
 * 2. Kills any existing server on port 3000
 * 3. Starts a test server on port 3000 with the branch's DATABASE_URL
 * 4. Runs unit tests (src/)
 * 5. Runs integration tests (tests/integration/)
 * 6. Runs Playwright tests (tests/playwright/)
 * 7. Cleans up the test server (branch auto-deletes via TTL)
 */

import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { spawn } from "child_process";
import { createBranch, BranchAlreadyExistsError } from "./create-branch";
import { startTestServer, type TestServer } from "./test-server";

// ANSI colors
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;

const TEST_SERVER_PORT = 3000;

async function runCommand(
  command: string,
  args: string[],
  env: Record<string, string>,
): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      env: { ...process.env, ...env },
    });

    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 1));
  });
}

async function main() {
  // Parse arguments
  const args = process.argv.slice(2);
  const runUnitOnly = args.includes("--unit");
  const runIntegrationOnly = args.includes("--integration");
  const runPlaywrightOnly = args.includes("--playwright");
  const runAll = !runUnitOnly && !runIntegrationOnly && !runPlaywrightOnly;

  // Get any additional args to pass to test commands (after --)
  const dashDashIndex = args.indexOf("--");
  const extraArgs = dashDashIndex >= 0 ? args.slice(dashDashIndex + 1) : [];

  let testServer: TestServer | null = null;

  try {
    // 1. Create schema-only branch (with 1hr TTL for auto-cleanup)
    // Use timestamp + random suffix to avoid collisions when script runs twice quickly
    const branchName = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    console.log(bold("\n=== Creating test database branch ===\n"));
    const branch = await createBranch(branchName);

    // 2. Start test server (kills any existing server on port 3000 first)
    console.log(bold("\n=== Starting test server ===\n"));
    testServer = await startTestServer({
      port: TEST_SERVER_PORT,
      databaseUrl: branch.connectionString,
      timeout: 90000, // 90s timeout for server startup
    });

    const testEnv = {
      DATABASE_URL: branch.connectionString,
      TEST_BASE_URL: testServer.url,
      NODE_ENV: "test",
    };

    console.log(bold("\n=== Test environment ===\n"));
    console.log(dim(`  TEST_BASE_URL: ${testServer.url}`));
    console.log(
      dim(`  DATABASE_URL: ${branch.connectionString.slice(0, 50)}...`),
    );
    console.log("");

    let unitTestCode = 0;
    let integrationTestCode = 0;
    let playwrightTestCode = 0;

    // 3. Run unit tests (src/**/*.test.ts)
    if (runAll || runUnitOnly) {
      console.log(bold("\n=== Running unit tests (src/) ===\n"));
      unitTestCode = await runCommand(
        "bun",
        ["test", "src", ...extraArgs],
        testEnv,
      );

      if (unitTestCode === 0) {
        console.log(green(bold("\n=== Unit tests passed ===\n")));
      } else {
        console.log(red(bold("\n=== Unit tests failed ===\n")));
      }
    }

    // 4. Run integration tests (tests/integration/)
    if (runAll || runIntegrationOnly) {
      console.log(bold("\n=== Running integration tests ===\n"));
      integrationTestCode = await runCommand(
        "bun",
        ["test", "tests/integration", ...extraArgs],
        testEnv,
      );

      if (integrationTestCode === 0) {
        console.log(green(bold("\n=== Integration tests passed ===\n")));
      } else {
        console.log(red(bold("\n=== Integration tests failed ===\n")));
      }
    }

    // 5. Run Playwright tests (tests/playwright/)
    if (runAll || runPlaywrightOnly) {
      console.log(bold("\n=== Running Playwright tests ===\n"));
      playwrightTestCode = await runCommand(
        "bunx",
        ["playwright", "test", ...extraArgs],
        testEnv,
      );

      if (playwrightTestCode === 0) {
        console.log(green(bold("\n=== Playwright tests passed ===\n")));
      } else {
        console.log(red(bold("\n=== Playwright tests failed ===\n")));
      }
    }

    // 6. Report final result
    const finalCode = unitTestCode || integrationTestCode || playwrightTestCode;
    if (finalCode === 0) {
      console.log(green(bold("\n=== All tests passed ===\n")));
    } else {
      console.log(red(bold("\n=== Some tests failed ===\n")));
    }

    // Branch auto-deletes via expires_at, no cleanup needed
    return finalCode;
  } catch (error) {
    // Handle branch already exists - exit immediately without running tests
    if (error instanceof BranchAlreadyExistsError) {
      console.error(
        red(
          "\nBranch already exists - aborting to prevent running against wrong database.",
        ),
      );
      console.error(
        red("This may happen if the script ran twice in quick succession."),
      );
      console.error(
        red("Wait a moment and try again, or use a different branch name.\n"),
      );
      return 1;
    }

    console.error(red("\nError running tests:"));
    console.error(error instanceof Error ? error.message : error);
    return 1;
  } finally {
    // Always clean up the test server
    if (testServer) {
      console.log(dim("\n=== Cleaning up ===\n"));
      testServer.kill();
    }
  }
}

main()
  .then((code) => {
    process.exit(code);
  })
  .catch((error) => {
    console.error(red("\nUnexpected error:"));
    console.error(error);
    process.exit(1);
  });
