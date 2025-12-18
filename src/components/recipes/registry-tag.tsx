import { promises as fs } from "fs";
import path from "path";
import { codeToHtml } from "shiki";
import { RegistryTagClient, type RegistryFile } from "./registry-tag-client";

interface RegistryTagProps {
  items: string;
}

type RegistryItemJson = {
  name: string;
  files: Array<{
    path: string;
    content: string;
  }>;
};

type RawFile = {
  path: string;
  content: string;
};

const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  ts: "typescript",
  tsx: "tsx",
  js: "javascript",
  jsx: "jsx",
  json: "json",
  css: "css",
  html: "html",
  sql: "sql",
  yaml: "yaml",
  yml: "yaml",
  md: "markdown",
  py: "python",
  go: "go",
  rs: "rust",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
};

function getLanguageFromPath(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase();
  return ext ? (EXTENSION_TO_LANGUAGE[ext] ?? "typescript") : "typescript";
}

function getRegistryCommand(names: string[]) {
  const urls = names
    .map((name) => `https://fullstackrecipes.com/r/${name}.json`)
    .join(" ");
  return `bunx --bun shadcn@latest add ${urls}`;
}

async function getRawFiles(names: string[]): Promise<RawFile[]> {
  const allFiles: RawFile[] = [];

  for (const name of names) {
    try {
      const filePath = path.join(process.cwd(), "public", "r", `${name}.json`);
      const content = await fs.readFile(filePath, "utf-8");
      const data = JSON.parse(content) as RegistryItemJson;

      for (const file of data.files) {
        if (file.content) {
          allFiles.push({
            path: file.path,
            content: file.content,
          });
        }
      }
    } catch {
      console.warn(`Registry file not found for: ${name}`);
    }
  }

  return allFiles;
}

async function highlightFiles(rawFiles: RawFile[]): Promise<RegistryFile[]> {
  return Promise.all(
    rawFiles.map(async (file) => {
      const language = getLanguageFromPath(file.path);
      const [lightHtml, darkHtml] = await Promise.all([
        codeToHtml(file.content, { lang: language, theme: "one-light" }),
        codeToHtml(file.content, { lang: language, theme: "one-dark-pro" }),
      ]);
      return {
        path: file.path,
        content: file.content,
        lightHtml,
        darkHtml,
      };
    }),
  );
}

export async function RegistryTag({ items }: RegistryTagProps) {
  const names = items
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (names.length === 0) {
    return null;
  }

  const command = getRegistryCommand(names);
  const rawFiles = await getRawFiles(names);
  const files = await highlightFiles(rawFiles);

  return <RegistryTagClient command={command} files={files} />;
}
