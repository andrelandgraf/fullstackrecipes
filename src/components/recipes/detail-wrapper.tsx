"use client";

import type { ReactNode } from "react";
import { SelectionProvider } from "@/lib/recipes/selection-context";
import { WizardDialog } from "@/components/wizard/wizard-dialog";

type DetailWrapperProps = {
  children: ReactNode;
  slug: string;
};

export function DetailWrapper({ children, slug }: DetailWrapperProps) {
  return (
    <SelectionProvider initialSlugs={[slug]}>
      {children}
      <WizardDialog
        mode="agent-only"
        queryParam="wizard"
        showTrigger={false}
        overrideSlugs={[slug]}
      />
    </SelectionProvider>
  );
}
