### Core Pattern: Server-Side Session Check

The standard pattern for protecting pages uses server-side session validation with redirect:

```tsx
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/server";

export default async function ProtectedPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  return <div>Welcome, {session.user.name}</div>;
}
```

This pattern:

- Runs entirely on the server (no client-side flash)
- Redirects unauthenticated users before rendering
- Provides the session data for use in the page

---

## Example: Public Landing Page

Create a public landing page with sign-in/sign-up buttons:

```tsx
// src/app/page.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-8 p-4">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">
          Welcome to Your App
        </h1>
        <p className="text-xl text-muted-foreground max-w-md">
          Sign in to access your dashboard and start using the app.
        </p>
      </div>
      <div className="flex gap-4">
        <Link href="/sign-in">
          <Button variant="outline" size="lg">
            Sign in
          </Button>
        </Link>
        <Link href="/sign-up">
          <Button size="lg">Get started</Button>
        </Link>
      </div>
    </div>
  );
}
```

---

## Example: Protected Chat Page

Move your main app functionality to a protected route:

```tsx
// src/app/chats/page.tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { ChefHat } from "lucide-react";
import { auth } from "@/lib/auth/server";
import { getUserChats } from "@/lib/chat/queries";
import { ChatList } from "@/components/chats/chat-list";
import { UserMenu } from "@/components/auth/user-menu";
import { ThemeSelector } from "@/components/themes/selector";

export const metadata: Metadata = {
  title: "Your Chats",
  description: "View and manage your AI conversations.",
};

export default async function ChatsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const chats = await getUserChats(session.user.id);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
                <ChefHat className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-mono text-lg font-semibold tracking-tight">
                Your App
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <ThemeSelector />
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Your Chats</h1>
          <p className="text-muted-foreground mt-1">
            View and manage your conversations
          </p>
        </div>

        <ChatList initialChats={chats} />
      </main>
    </div>
  );
}
```

---

## Auth Pages: Redirect Authenticated Users

Auth pages should redirect already-authenticated users away:

```tsx
// src/app/sign-in/page.tsx
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/server";
import { SignIn } from "@/components/auth/sign-in";

export default async function SignInPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect("/chats"); // Redirect to app when already signed in
  }

  return (
    <main className="min-h-dvh flex items-center justify-center p-4">
      <SignIn />
    </main>
  );
}
```

---

## Route Structure

A typical app has three types of routes:

| Route Type    | Example                | Auth Behavior                        |
| ------------- | ---------------------- | ------------------------------------ |
| **Public**    | `/`, `/pricing`        | Anyone can access                    |
| **Auth**      | `/sign-in`, `/sign-up` | Redirect to app if signed in         |
| **Protected** | `/chats`, `/profile`   | Redirect to sign-in if not signed in |

### Example Directory Structure

```
src/app/
  page.tsx              # Public landing page
  pricing/page.tsx      # Public pricing page

  sign-in/page.tsx      # Auth: redirects if signed in
  sign-up/page.tsx      # Auth: redirects if signed in
  forgot-password/page.tsx
  reset-password/page.tsx
  verify-email/page.tsx

  chats/                # Protected: requires auth
    page.tsx            # Chat list
    [chatId]/page.tsx   # Individual chat

  profile/page.tsx      # Protected: account settings
```

---

## Loading User Data

For protected pages that need user-specific data, fetch it server-side after authentication:

```tsx
export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  // Fetch user-specific data using the session
  const [chats, subscription] = await Promise.all([
    getUserChats(session.user.id),
    getUserSubscription(session.user.id),
  ]);

  return (
    <Dashboard user={session.user} chats={chats} subscription={subscription} />
  );
}
```

---

## Callback URLs

When redirecting to sign-in, you may want to return users to their original destination. The auth components support callback URLs:

```tsx
// In your SignIn component
await signIn.email({
  email,
  password,
  callbackURL: "/chats", // Where to go after sign in
});
```

For dynamic redirect-back behavior, you can use search params:

```tsx
// Protected page: redirect with return URL
if (!session) {
  redirect(`/sign-in?returnTo=${encodeURIComponent("/chats/123")}`);
}

// Sign-in page: read the return URL
const searchParams = await props.searchParams;
const returnTo = searchParams.returnTo || "/chats";

// After sign in success
router.push(returnTo);
```

---

## Summary

1. **Public pages** - No session check needed
2. **Auth pages** - Redirect away if already signed in
3. **Protected pages** - Redirect to sign-in if not authenticated
4. Use `auth.api.getSession()` server-side for immediate protection without flash
5. Fetch user-specific data after validating the session
