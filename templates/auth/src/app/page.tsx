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
          <span className="font-semibold text-lg">My App</span>
          <div className="flex items-center gap-2">
            <ThemeSelector />
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center gap-8 p-4">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">
            Welcome to Your App
          </h1>
          <p className="text-xl text-muted-foreground max-w-md">
            {session
              ? `Hello, ${session.user.name}! You're signed in.`
              : "Sign in to access your dashboard and start using the app."}
          </p>
        </div>
        <div className="flex gap-4">
          {session ? (
            <>
              <Link href="/profile">
                <Button variant="outline" size="lg">
                  Settings
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/sign-in">
                <Button variant="outline" size="lg">
                  Sign in
                </Button>
              </Link>
              <Link href="/sign-up">
                <Button size="lg">Get started</Button>
              </Link>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
