"use client";

import { CodeBlock } from "@/components/code/code-block";

type CodeBlockClientProps = {
  filePath: string | null;
  fileExt: string | null;
  language: string;
  code: string;
  lightHtml: string;
  darkHtml: string;
  hasFilePath: boolean;
};

export function CodeBlockClient(props: CodeBlockClientProps) {
  return <CodeBlock {...props} className="my-4" />;
}
