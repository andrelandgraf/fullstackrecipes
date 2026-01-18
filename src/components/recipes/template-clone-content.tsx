import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyableCodeBox } from "@/components/code/copyable-code-box";

type TemplateCloneContentProps = {
  template: string;
  githubUrl: string;
};

export function TemplateCloneContent({
  template,
  githubUrl,
}: TemplateCloneContentProps) {
  const degitCommand = `npx tiged ${template} my-app`;

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-medium text-foreground">
          Clone with tiged
        </p>
        <CopyableCodeBox code={degitCommand} />
        <p className="mt-2 text-xs text-muted-foreground">
          Then run <code className="rounded bg-muted px-1">cd my-app</code> and{" "}
          <code className="rounded bg-muted px-1">bun install</code>
        </p>
      </div>

      <div className="border-t pt-4">
        <p className="mb-2 text-sm font-medium text-foreground">
          Review on GitHub
        </p>
        <div>
          <Button variant="outline" className="gap-2" asChild>
            <a href={githubUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
              View Template Files
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
