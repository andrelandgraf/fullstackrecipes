"use client";

import { useState, useEffect } from "react";
import { codeToHtml, type BundledLanguage } from "shiki";

/** Highlight a code snippet for both light and dark themes via Shiki. */
export function useHighlightedCode(code: string, language: BundledLanguage) {
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
