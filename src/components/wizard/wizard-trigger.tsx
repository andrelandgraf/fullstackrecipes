import { Suspense } from "react";
import { WizardTriggerClient } from "@/components/wizard/wizard-dialog";

type WizardTriggerProps = {
  children: React.ReactNode;
  queryParam?: string;
};

export function WizardTrigger(props: WizardTriggerProps) {
  return (
    <Suspense fallback={<span>{props.children}</span>}>
      <WizardTriggerClient {...props} />
    </Suspense>
  );
}

