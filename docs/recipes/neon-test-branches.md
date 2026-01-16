## Environment Variables

First, create a script config file for the Neon API access:

```typescript
// scripts/tests/config.ts
import { configSchema, server } from "scripts/tests/config/schema";

export const neonConfig = configSchema("Neon", {
  apiKey: server({ env: "NEON_API_KEY" }),
  projectId: server({ env: "NEON_PROJECT_ID" }),
});
```

Add the environment variables to `.env.local`:

```
NEON_API_KEY=your-neon-api-key
NEON_PROJECT_ID=your-neon-project-id
```

Get the API key from the Neon Console under Account Settings > API Keys. The project ID is visible in your project's dashboard URL.

---

## Create Branch Script

Create `scripts/tests/create-branch.ts` to create isolated database branches for testing:

```typescript
// scripts/tests/create-branch.ts
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
 */

import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { neonConfig } from "./config";

const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;

export class BranchAlreadyExistsError extends Error {
  constructor(branchName: string) {
    super(`Branch "${branchName}" already exists`);
    this.name = "BranchAlreadyExistsError";
  }
}

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
          // Schema-only: copies schema from main without data
          init_source: "schema-only",
          // Auto-delete after TTL
          expires_at: expiresAt,
        },
        endpoints: [
          {
            type: "read_write",
            settings: {
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

    if (response.status === 409 || errorText.includes("already exists")) {
      throw new BranchAlreadyExistsError(name);
    }

    throw new Error(
      `Failed to create branch: ${response.status} - ${errorText}`,
    );
  }

  const data: NeonBranchResponse = await response.json();

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

if (import.meta.main) {
  main();
}
```

---

## Neon Config File

Create the config file at `scripts/tests/config.ts`:

```typescript
import { configSchema, server } from "@/lib/config/schema";

export const neonConfig = configSchema("Neon", {
  apiKey: server({ env: "NEON_API_KEY" }),
  projectId: server({ env: "NEON_PROJECT_ID" }),
});
```

---

## Test Server Script

Create `scripts/tests/test-server.ts` to manage the Next.js dev server during tests:

```typescript
#!/usr/bin/env bun
/**
 * Test Server Manager
 *
 * Starts a Next.js dev server for testing with custom environment variables.
 * Kills any existing server on the port first, then starts a fresh one.
 */

import { spawn, spawnSync, type ChildProcess } from "child_process";

const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;

export type TestServerOptions = {
  port: number;
  databaseUrl: string;
  timeout?: number;
};

export type TestServer = {
  port: number;
  url: string;
  kill: () => void;
};

function killProcessOnPort(port: number): boolean {
  const lsofResult = spawnSync("lsof", ["-ti", `:${port}`], {
    encoding: "utf-8",
  });

  const pids = lsofResult.stdout
    .trim()
    .split("\n")
    .filter((pid) => pid.length > 0);

  if (pids.length === 0) {
    return false;
  }

  for (const pid of pids) {
    spawnSync("kill", ["-9", pid]);
  }

  return true;
}

async function waitForServer(url: string, timeout: number): Promise<boolean> {
  const startTime = Date.now();
  const pollInterval = 500;

  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(url, {
        method: "HEAD",
        signal: AbortSignal.timeout(2000),
      });
      if (response.ok || response.status === 404) {
        return true;
      }
    } catch {
      // Server not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  return false;
}

export async function startTestServer(
  options: TestServerOptions,
): Promise<TestServer> {
  const { port, databaseUrl, timeout = 60000 } = options;
  const url = `http://localhost:${port}`;

  console.log(dim(`  Checking for existing process on port ${port}...`));
  const killed = killProcessOnPort(port);
  if (killed) {
    console.log(yellow(`  Killed existing process on port ${port}`));
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log(dim(`  Starting test server on port ${port}...`));

  const serverProcess: ChildProcess = spawn(
    "bun",
    ["run", "next", "dev", "-p", String(port)],
    {
      env: {
        ...process.env,
        PORT: String(port),
        DATABASE_URL: databaseUrl,
        NODE_ENV: "test",
        NEXT_TELEMETRY_DISABLED: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
      detached: false,
    },
  );

  let serverOutput = "";
  serverProcess.stdout?.on("data", (data) => {
    serverOutput += data.toString();
  });
  serverProcess.stderr?.on("data", (data) => {
    serverOutput += data.toString();
  });

  serverProcess.on("error", (error) => {
    console.error(red(`  Test server process error: ${error.message}`));
  });

  console.log(
    dim(`  Waiting for server to be ready (timeout: ${timeout / 1000}s)...`),
  );
  const isReady = await waitForServer(url, timeout);

  if (!isReady) {
    serverProcess.kill("SIGTERM");
    console.error(red("\n  Server output:"));
    console.error(dim(serverOutput.slice(-2000)));
    throw new Error(`Test server failed to start within ${timeout / 1000}s`);
  }

  console.log(green(`  ✓ Test server ready at ${url}`));

  return {
    port,
    url,
    kill: () => {
      if (!serverProcess.killed) {
        console.log(dim(`  Stopping test server...`));
        serverProcess.kill("SIGTERM");

        setTimeout(() => {
          if (!serverProcess.killed) {
            serverProcess.kill("SIGKILL");
          }
        }, 5000);
      }
    },
  };
}
```

---

## Test Orchestration Script

Create `scripts/tests/test-with-branch.ts` to orchestrate the full test workflow:

```typescript
#!/usr/bin/env bun
/**
 * Run tests with a fresh Neon database branch and isolated test server
 *
 * Usage:
 *   bun run scripts/tests/test-with-branch.ts                    # Run all tests
 *   bun run scripts/tests/test-with-branch.ts --unit             # Run only unit tests
 *   bun run scripts/tests/test-with-branch.ts --integration      # Run only integration tests
 *   bun run scripts/tests/test-with-branch.ts --playwright       # Run only Playwright tests
 *   bun run scripts/tests/test-with-branch.ts -- --timeout 60000
 *
 * This script:
 * 1. Creates a schema-only branch from main (with 1hr TTL)
 * 2. Kills any existing server on port 3000
 * 3. Starts a test server on port 3000 with the branch's DATABASE_URL
 * 4. Runs unit tests (src/**/*.test.ts)
 * 5. Runs integration tests (tests/integration/)
 * 6. Runs Playwright tests (tests/playwright/)
 * 7. Cleans up the test server (branch auto-deletes via TTL)
 */

import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { spawn } from "child_process";
import { createBranch, BranchAlreadyExistsError } from "./create-branch";
import { startTestServer, type TestServer } from "./test-server";

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
  const args = process.argv.slice(2);
  const runUnitOnly = args.includes("--unit");
  const runIntegrationOnly = args.includes("--integration");
  const runPlaywrightOnly = args.includes("--playwright");
  const runAll = !runUnitOnly && !runIntegrationOnly && !runPlaywrightOnly;

  const dashDashIndex = args.indexOf("--");
  const extraArgs = dashDashIndex >= 0 ? args.slice(dashDashIndex + 1) : [];

  let testServer: TestServer | null = null;

  try {
    const branchName = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    console.log(bold("\n=== Creating test database branch ===\n"));
    const branch = await createBranch(branchName);

    console.log(bold("\n=== Starting test server ===\n"));
    testServer = await startTestServer({
      port: TEST_SERVER_PORT,
      databaseUrl: branch.connectionString,
      timeout: 90000,
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

    const finalCode = unitTestCode || integrationTestCode || playwrightTestCode;
    if (finalCode === 0) {
      console.log(green(bold("\n=== All tests passed ===\n")));
    } else {
      console.log(red(bold("\n=== Some tests failed ===\n")));
    }

    return finalCode;
  } catch (error) {
    if (error instanceof BranchAlreadyExistsError) {
      console.error(
        red("\nBranch already exists - aborting."),
      );
      return 1;
    }

    console.error(red("\nError running tests:"));
    console.error(error instanceof Error ? error.message : error);
    return 1;
  } finally {
    if (testServer) {
      console.log(dim("\n=== Cleaning up ===\n"));
      testServer.kill();
    }
  }
}

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error(red("\nUnexpected error:"));
    console.error(error);
    process.exit(1);
  });
```

---

## Package.json Scripts

Add test scripts to `package.json`:

```json
{
  "scripts": {
    "test": "bun run scripts/tests/test-with-branch.ts",
    "test:unit": "bun run scripts/tests/test-with-branch.ts --unit",
    "test:integration": "bun run scripts/tests/test-with-branch.ts --integration",
    "test:playwright": "bun run scripts/tests/test-with-branch.ts --playwright",
    "db:branch:create": "bun run scripts/tests/create-branch.ts"
  }
}
```

---

## How It Works

1. **Branch Creation**: Creates a schema-only branch from the main database with a 1-hour TTL
2. **Server Start**: Starts Next.js with the branch's `DATABASE_URL`
3. **Test Execution**: Runs tests against the isolated environment
4. **Auto-Cleanup**: Branch auto-deletes after TTL expires (no manual cleanup needed)

Schema-only branches contain the database structure but no data, ensuring tests start with a clean slate.
