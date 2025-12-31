"use client";

import { FolderGit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TemplateCloneContent } from "./template-clone-content";

interface UseTemplateButtonProps {
  template: string;
}

export function UseTemplateButton({ template }: UseTemplateButtonProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="default" size="sm" className="gap-2">
          <FolderGit2 className="h-4 w-4" />
          Use Template
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Clone Template</DialogTitle>
          <DialogDescription>
            Get started instantly by cloning this cookbook as a template.
          </DialogDescription>
        </DialogHeader>
        <div className="pt-4">
          <TemplateCloneContent template={template} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
