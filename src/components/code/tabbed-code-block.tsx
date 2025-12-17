"use client";

import { useState, useEffect } from "react";
import { codeToHtml, type BundledLanguage } from "shiki";
import { CodeBlock } from "@/components/code/code-block";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export type CodeTabItem = {
  id: string;
  label: string;
  code: string;
  language: BundledLanguage;
  filePath?: string;
};

type TabbedCodeBlockProps = {
  tabs: CodeTabItem[];
  defaultTab?: string;
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
};

function useHighlightedCode(code: string, language: BundledLanguage) {
  const [html, setHtml] = useState<{ light: string; dark: string } | null>(
    null,
  );

  useEffect(() => {
    let mounted = true;
    Promise.all([
      codeToHtml(code, { lang: language, theme: "one-light" }),
      codeToHtml(code, { lang: language, theme: "one-dark-pro" }),
    ]).then(([light, dark]) => {
      if (mounted) {
        setHtml({ light, dark });
      }
    });
    return () => {
      mounted = false;
    };
  }, [code, language]);

  return html;
}

function CodeBlockWithHighlight({
  code,
  language,
  filePath,
  className,
}: {
  code: string;
  language: BundledLanguage;
  filePath?: string;
  className?: string;
}) {
  const html = useHighlightedCode(code, language);
  const fileExt = filePath?.split(".").pop()?.toLowerCase() ?? null;

  if (!html) {
    return (
      <div className={`rounded-md border bg-background p-4 ${className ?? ""}`}>
        <pre className="overflow-x-auto font-mono text-sm">
          <code>{code}</code>
        </pre>
      </div>
    );
  }

  return (
    <CodeBlock
      filePath={filePath ?? null}
      fileExt={fileExt}
      language={language}
      code={code}
      lightHtml={html.light}
      darkHtml={html.dark}
      hasFilePath={!!filePath}
      className={className}
    />
  );
}

export function TabbedCodeBlock({
  tabs,
  defaultTab,
  activeTab,
  onTabChange,
}: TabbedCodeBlockProps) {
  // Radix handles controlled/uncontrolled internally
  const tabsProps = activeTab
    ? { value: activeTab, onValueChange: onTabChange }
    : { defaultValue: defaultTab ?? tabs[0]?.id, onValueChange: onTabChange };

  return (
    <Tabs {...tabsProps}>
      <TabsList>
        {tabs.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent key={tab.id} value={tab.id}>
          <CodeBlockWithHighlight
            code={tab.code}
            language={tab.language}
            filePath={tab.filePath}
            className="rounded-t-none border-t-0"
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}
