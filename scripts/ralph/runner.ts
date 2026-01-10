#!/usr/bin/env bun

import { spawn } from "bun";
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const FINISH_SIGNAL = "FINISHED ALL FEATURE WORK";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const promptPath = join(scriptDir, "prompt.md");

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    prompt: { type: "string" },
  },
});

async function runClaudeCode(): Promise<boolean> {
  const baselinePrompt = await readFile(promptPath, "utf-8");

  const prompt = values.prompt
    ? `Follow this correction/override prompt: ${values.prompt} -\n\nBaseline prompt: ${baselinePrompt}`
    : baselinePrompt;

  const proc = spawn(["claude-code"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "inherit",
  });

  proc.stdin.write(prompt);
  proc.stdin.end();

  let output = "";

  const reader = proc.stdout.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    output += chunk;
    process.stdout.write(chunk);

    if (output.includes(FINISH_SIGNAL)) {
      console.log("\n\n[runner] Detected finish signal. Exiting...");
      proc.kill();
      return true;
    }
  }

  await proc.exited;

  if (output.includes(FINISH_SIGNAL)) {
    console.log("\n\n[runner] Detected finish signal. Exiting...");
    return true;
  }

  return false;
}

async function main() {
  console.log("[runner] Starting Ralph agent loop...\n");

  let iteration = 1;
  while (true) {
    console.log(`\n[runner] === Iteration ${iteration} ===\n`);

    const finished = await runClaudeCode();
    if (finished) {
      console.log("[runner] All feature work completed!");
      process.exit(0);
    }

    iteration++;
    console.log("\n[runner] Restarting claude-code...\n");
  }
}

main().catch((err) => {
  console.error("[runner] Error:", err);
  process.exit(1);
});
