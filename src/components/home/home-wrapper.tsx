"use client";

import type { ReactNode } from "react";
import { SelectionProvider } from "@/lib/recipes/selection-context";
import { WizardDialog } from "@/components/wizard/wizard-dialog";

type HomeWrapperProps = {
  children: ReactNode;
};

export function HomeWrapper({ children }: HomeWrapperProps) {
  return (
    <SelectionProvider>
      {children}
      {/* Full wizard from hero button */}
      <WizardDialog mode="full" queryParam="wizard" showTrigger={false} />
      {/* Recipes-only picker from how-it-works */}
      <WizardDialog
        mode="recipes-only"
        queryParam="picker"
        showTrigger={false}
      />
    </SelectionProvider>
  );
}
