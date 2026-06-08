#!/usr/bin/env bun
/**
 * Test Server Manager
 *
 * Starts a Next.js dev server for testing with custom environment variables.
 * Kills any existing server on the port first, then starts a fresh one.
 */

import { spawn, spawnSync, type ChildProcess } from "child_process";

// ANSI colors
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;

export type TestServerOptions = {
  port: number;
  databaseUrl: string;
  timeout?: number; // ms to wait for server ready
};

export type TestServer = {
  port: number;
  url: string;
  kill: () => void;
};

/**
 * Kill any process running on a specific port
 */
function killProcessOnPort(port: number): boolean {
  // Find PIDs using the port
  const lsofResult = spawnSync("lsof", ["-ti", `:${port}`], {
    encoding: "utf-8",
  });

  const pids = lsofResult.stdout
    .trim()
    .split("\n")
    .filter((pid) => pid.length > 0);

  if (pids.length === 0) {
    return false; // No process to kill
  }

  // Kill each PID
  for (const pid of pids) {
    spawnSync("kill", ["-9", pid]);
  }

  return true;
}

/**
 * Wait for a URL to respond with 200
 */
async function waitForServer(url: string, timeout: number): Promise<boolean> {
  const startTime = Date.now();
  const pollInterval = 500; // ms

  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(url, {
        method: "HEAD",
        signal: AbortSignal.timeout(2000),
      });
      if (response.ok || response.status === 404) {
        // 404 is fine - server is running, just no route
        return true;
      }
    } catch {
      // Server not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  return false;
}

/**
 * Start a Next.js dev server with custom environment
 * Kills any existing server on the port first
 */
export async function startTestServer(
  options: TestServerOptions,
): Promise<TestServer> {
  const { port, databaseUrl, timeout = 60000 } = options;
  const url = `http://localhost:${port}`;

  // Kill any existing process on this port
  console.log(dim(`  Checking for existing process on port ${port}...`));
  const killed = killProcessOnPort(port);
  if (killed) {
    console.log(yellow(`  Killed existing process on port ${port}`));
    // Wait a moment for the port to be released
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log(dim(`  Starting test server on port ${port}...`));

  // Start Next.js dev server
  const serverProcess: ChildProcess = spawn(
    "bun",
    ["run", "next", "dev", "-p", String(port)],
    {
      env: {
        ...process.env,
        PORT: String(port),
        DATABASE_URL: databaseUrl,
        NODE_ENV: "test",
        // Disable telemetry in tests
        NEXT_TELEMETRY_DISABLED: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
      detached: false,
    },
  );

  // Capture output for debugging (optional)
  let serverOutput = "";
  serverProcess.stdout?.on("data", (data) => {
    serverOutput += data.toString();
  });
  serverProcess.stderr?.on("data", (data) => {
    serverOutput += data.toString();
  });

  // Handle server process errors
  serverProcess.on("error", (error) => {
    console.error(red(`  Test server process error: ${error.message}`));
  });

  // Wait for server to be ready
  console.log(
    dim(`  Waiting for server to be ready (timeout: ${timeout / 1000}s)...`),
  );
  const isReady = await waitForServer(url, timeout);

  if (!isReady) {
    serverProcess.kill("SIGTERM");
    console.error(red("\n  Server output:"));
    console.error(dim(serverOutput.slice(-2000))); // Last 2000 chars
    throw new Error(`Test server failed to start within ${timeout / 1000}s`);
  }

  console.log(green(`  ✓ Test server ready at ${url}`));

  // Return server handle with cleanup function
  return {
    port,
    url,
    kill: () => {
      if (!serverProcess.killed) {
        console.log(dim(`  Stopping test server...`));
        serverProcess.kill("SIGTERM");

        // Force kill after 5s if still running
        setTimeout(() => {
          if (!serverProcess.killed) {
            serverProcess.kill("SIGKILL");
          }
        }, 5000);
      }
    },
  };
}
