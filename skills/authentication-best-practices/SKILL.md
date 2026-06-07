---
name: authentication-best-practices
description: Read sessions client- and server-side, guard routes, and run sign in/up/out with Better Auth. Use when gating pages/APIs on auth or wiring auth flows.
---

# Authentication Best Practices

Read sessions, protect routes, and run sign in/up/out with Better Auth.

## Prerequisites

Complete these setup recipes first:

- Better Auth Setup

### Client-Side Sessions

Use the auth client hooks from `@/lib/auth/client` in client components.

```tsx
"use client";

import { useSession, signOut } from "@/lib/auth/client";

export function UserMenu() {
  const { data: session, isPending } = useSession();

  if (isPending) return <div>Loading...</div>;
  if (!session) return <a href="/sign-in">Sign In</a>;

  return (
    <div>
      <span>{session.user.name}</span>
      <button onClick={() => signOut()}>Sign Out</button>
    </div>
  );
}
```

### Server-Side Sessions

In Server Components and API routes, call `auth.api.getSession` with the request `headers`.

```typescript
import { auth } from "@/lib/auth/server";
import { headers } from "next/headers";

const session = await auth.api.getSession({ headers: await headers() });

if (!session) {
  return new Response("Unauthorized", { status: 401 });
}

// session.user.id for queries...
```

### Guarding Routes

Redirect unauthenticated users away from protected pages, and authenticated users away from auth pages.

```tsx
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/server";

export default async function ProtectedPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  return <Dashboard user={session.user} />;
}

export default async function SignInPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/chats");
  return <SignIn />;
}
```

After validating the session, fetch user-specific data in parallel.

```tsx
const [chats, profile] = await Promise.all([
  getUserChats(session.user.id),
  getUserProfile(session.user.id),
]);
```

### Sign In / Up / Out

```typescript
import { signIn, signUp, signOut } from "@/lib/auth/client";

await signIn.email({ email, password, callbackURL: "/chats" });
await signIn.social({ provider: "google", callbackURL: "/chats" });

await signUp.email({ email, password, name, callbackURL: "/verify-email" });

await signOut({
  fetchOptions: { onSuccess: () => router.push("/") },
});
```

---

## References

- [Better Auth React](https://www.better-auth.com/docs/react)
- [Better Auth Server](https://www.better-auth.com/docs/server)
