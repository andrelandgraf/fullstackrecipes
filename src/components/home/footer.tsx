import { ChefHat } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/50 py-12">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary">
              <ChefHat className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-mono text-sm text-muted-foreground">
              fullstackrecipes
            </span>
          </div>

          <p className="text-sm text-muted-foreground">
            built with love by{" "}
            <a
              href="https://x.com/andrelandgraf"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:text-primary"
            >
              @andrelandgraf
            </a>
          </p>

          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a
              href="https://github.com/andrelandgraf/fullstackrecipes"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground"
            >
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
