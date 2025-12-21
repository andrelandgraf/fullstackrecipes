"use client";

import { Suspense } from "react";
import { useQueryState, parseAsBoolean } from "nuqs";
import { Button } from "@/components/ui/button";
import { Wand2 } from "lucide-react";

function AddToAgentButtonInner() {
  const [, setIsOpen] = useQueryState(
    "wizard",
    parseAsBoolean.withDefault(false),
  );

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2"
      onClick={() => setIsOpen(true)}
    >
      <Wand2 className="h-4 w-4" />
      Add to Agent
    </Button>
  );
}

export function AddToAgentButton() {
  return (
    <Suspense
      fallback={
        <Button variant="outline" size="sm" className="gap-2" disabled>
          <Wand2 className="h-4 w-4" />
          Add to Agent
        </Button>
      }
    >
      <AddToAgentButtonInner />
    </Suspense>
  );
}
