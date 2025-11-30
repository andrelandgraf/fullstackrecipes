import { Button } from "@/components/ui/button";
import { MessageSquare, LogIn, UserPlus } from "lucide-react";
import Link from "next/link";

export function Playground() {
  return (
    <section className="border-b border-border/50 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-4 inline-flex items-center justify-center rounded-full bg-primary/10 p-3">
            <MessageSquare className="h-6 w-6 text-primary" />
          </div>

          <h2 className="mb-4 text-3xl font-bold tracking-tight">
            Try the Playground
          </h2>

          <p className="mb-8 text-muted-foreground">
            Experience the AI chat with persistent history. Sign in to start a
            conversation that picks up right where you left off.
          </p>

          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="gap-2 font-medium">
              <Link href="/sign-in">
                <LogIn className="h-4 w-4" />
                Sign In
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              size="lg"
              className="gap-2 font-medium"
            >
              <Link href="/sign-up">
                <UserPlus className="h-4 w-4" />
                Create Account
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
