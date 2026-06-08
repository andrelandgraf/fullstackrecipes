import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth/server";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/auth/user-menu";
import { ThemeSelector } from "@/components/themes/selector";

export default async function HomePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm">
              ▲
            </span>
            <span className="text-lg">Fullstack Recipe</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeSelector />
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center gap-8 p-4">
        <div className="text-center space-y-4 max-w-2xl">
          <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            The full fullstackrecipes.com stack
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            {session
              ? `Welcome back, ${session.user.name}`
              : "Build full-stack AI apps, faster"}
          </h1>
          <p className="text-lg text-muted-foreground">
            {session
              ? "Jump back into your chats or manage your account and subscription."
              : "Auth, AI chat with durable workflows, Stripe billing, typed config, logging, monitoring, and more — wired up and ready to ship."}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4">
          {session ? (
            <>
              <Link href="/chats">
                <Button size="lg">Go to chats</Button>
              </Link>
              <Link href="/settings">
                <Button variant="outline" size="lg">
                  Settings
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/sign-up">
                <Button size="lg">Get started</Button>
              </Link>
              <Link href="/sign-in">
                <Button variant="outline" size="lg">
                  Sign in
                </Button>
              </Link>
            </>
          )}
        </div>
      </main>

      <footer className="border-t">
        <div className="container mx-auto px-4 h-14 flex items-center justify-center text-sm text-muted-foreground">
          Built with the{" "}
          <a
            href="https://fullstackrecipes.com"
            className="ml-1 text-primary hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            fullstackrecipes.com
          </a>{" "}
          stack
        </div>
      </footer>
    </div>
  );
}
