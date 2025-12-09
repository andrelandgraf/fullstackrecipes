## Better Auth Setup

Add user authentication to your Next.js app using Better Auth with Drizzle ORM and Neon Postgres.

### MCP Server

Add the Better Auth MCP server to your `.cursor/mcp.json` for accurate API guidance:

```json
{
  "mcpServers": {
    "better-auth": {
      "url": "https://mcp.chonkie.ai/better-auth/better-auth-builder/mcp",
      "headers": {}
    }
  }
}
```

---

### Why Better Auth?

- **Type-safe**: Full TypeScript support with inferred types
- **Drizzle native**: First-class Drizzle adapter, no schema duplication
- **Flexible**: Email/password, social providers, passkeys, magic links via plugins
- **Modern**: Built for React 19, Server Components, and the App Router

---

### Prerequisites

- [Neon + Drizzle Setup](/recipes/neon-drizzle-setup) - Database configuration
- [Resend Setup](/recipes/resend-setup) - Required for email verification and password reset

---

### Step 1: Install the package

```bash
bun add better-auth
```

### Step 2: Add environment variables

Add to your `.env.local`:

```env
BETTER_AUTH_SECRET="your-random-secret-at-least-32-chars"
BETTER_AUTH_URL="http://localhost:3000"
```

Generate a secret using:

```bash
openssl rand -base64 32
```

### Step 3: Create the auth config

Create `src/lib/auth/config.ts` following the [Environment Variable Management](/recipes/env-config) pattern:

```typescript
import { z } from "zod";
import { validateConfig, type PreValidate } from "../common/validate-config";

const AuthConfigSchema = z.object({
  secret: z.string("BETTER_AUTH_SECRET must be defined."),
  url: z.string("BETTER_AUTH_URL must be defined."),
});

export type AuthConfig = z.infer<typeof AuthConfigSchema>;

const config: PreValidate<AuthConfig> = {
  secret: process.env.BETTER_AUTH_SECRET,
  url: process.env.BETTER_AUTH_URL,
};

export const authConfig = validateConfig(AuthConfigSchema, config);
```

### Step 4: Update package.json scripts

Update your `package.json` scripts to generate the auth schema before running Drizzle migrations:

```json
{
  "scripts": {
    "db:auth:generate": "bunx @better-auth/cli@latest generate --config src/lib/auth/server.tsx --output src/lib/auth/schema.ts",
    "db:generate": "bun run db:auth:generate && drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate"
  }
}
```

The `db:auth:generate` script uses the Better Auth CLI to generate the schema from your server config. The `db:generate` script chains both commands so your auth schema is always in sync before generating Drizzle migrations.

### Step 5: Create email templates

Create email templates for all auth flows. These are simple examples - customize styling as needed.

**Password Reset** - `src/lib/auth/emails/forgot-password.tsx`:

```tsx
interface ForgotPasswordEmailProps {
  resetLink: string;
  userName?: string;
}

export function ForgotPasswordEmail({
  resetLink,
  userName,
}: ForgotPasswordEmailProps) {
  return (
    <div>
      <h1>Reset Your Password</h1>
      <p>
        {userName ? `Hi ${userName},` : "Hi,"} we received a request to reset
        your password.
      </p>
      <a href={resetLink}>Reset Password</a>
      <p>If you did not request a password reset, please ignore this email.</p>
    </div>
  );
}
```

**Email Verification** - `src/lib/auth/emails/verify-email.tsx`:

```tsx
interface VerifyEmailProps {
  verificationLink: string;
  userName?: string;
}

export function VerifyEmail({ verificationLink, userName }: VerifyEmailProps) {
  return (
    <div>
      <h1>Verify your email address</h1>
      <p>
        {userName ? `Hi ${userName},` : "Hi,"} please verify your email to
        complete registration.
      </p>
      <a href={verificationLink}>Verify Email Address</a>
      <p>If you didn't create an account, you can safely ignore this email.</p>
    </div>
  );
}
```

**Change Email Confirmation** - `src/lib/auth/emails/change-email.tsx`:

```tsx
interface ChangeEmailProps {
  confirmationLink: string;
  newEmail: string;
  userName?: string;
}

export function ChangeEmail({
  confirmationLink,
  newEmail,
  userName,
}: ChangeEmailProps) {
  return (
    <div>
      <h1>Approve email change</h1>
      <p>
        {userName ? `Hi ${userName},` : "Hi,"} we received a request to change
        your email to {newEmail}.
      </p>
      <a href={confirmationLink}>Approve Email Change</a>
      <p>If you didn't request this change, please ignore this email.</p>
    </div>
  );
}
```

**Delete Account Verification** - `src/lib/auth/emails/delete-account.tsx`:

```tsx
interface DeleteAccountEmailProps {
  confirmationLink: string;
  userName?: string;
}

export function DeleteAccountEmail({
  confirmationLink,
  userName,
}: DeleteAccountEmailProps) {
  return (
    <div>
      <h1>Confirm Account Deletion</h1>
      <p>
        {userName ? `Hi ${userName},` : "Hi,"} we received a request to delete
        your account.
      </p>
      <p>
        <strong>Warning:</strong> This action cannot be undone.
      </p>
      <a href={confirmationLink}>Delete My Account</a>
      <p>If you didn't request this, please ignore this email.</p>
    </div>
  );
}
```

### Step 6: Create the auth server instance

Create `src/lib/auth/server.tsx` with full email verification, change email, and delete account support:

```tsx
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/client";
import { authConfig } from "./config";
import { sendEmail } from "../resend/send";
import { ForgotPasswordEmail } from "./emails/forgot-password";
import { VerifyEmail } from "./emails/verify-email";
import { ChangeEmail } from "./emails/change-email";
import { DeleteAccountEmail } from "./emails/delete-account";

export const auth = betterAuth({
  secret: authConfig.secret,
  baseURL: authConfig.url,
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    async sendResetPassword({ user, url }) {
      void sendEmail({
        to: user.email,
        subject: "Reset Your Password",
        react: <ForgotPasswordEmail resetLink={url} userName={user.name} />,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    async sendVerificationEmail({ user, url }) {
      void sendEmail({
        to: user.email,
        subject: "Verify your email address",
        react: <VerifyEmail verificationLink={url} userName={user.name} />,
      });
    },
  },
  user: {
    changeEmail: {
      enabled: true,
      async sendChangeEmailConfirmation({ user, newEmail, url }) {
        void sendEmail({
          to: user.email,
          subject: "Approve email change",
          react: (
            <ChangeEmail
              confirmationLink={url}
              newEmail={newEmail}
              userName={user.name}
            />
          ),
        });
      },
    },
    deleteUser: {
      enabled: true,
      async sendDeleteAccountVerification({ user, url }) {
        void sendEmail({
          to: user.email,
          subject: "Confirm account deletion",
          react: (
            <DeleteAccountEmail confirmationLink={url} userName={user.name} />
          ),
        });
      },
    },
  },
});
```

> **Note:** Using `void` instead of `await` for email sending prevents timing attacks and improves response times.

### Step 7: Create the API route handler

Create `src/app/api/auth/[...all]/route.ts`:

```typescript
import { auth } from "@/lib/auth/server";
import { toNextJsHandler } from "better-auth/next-js";

export const { POST, GET } = toNextJsHandler(auth);
```

### Step 8: Create the auth client

Create `src/lib/auth/client.ts`:

```typescript
"use client";

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;
```

### Step 9: Add Toaster to layout

Update `src/app/layout.tsx` to include the toast notification provider:

```tsx
import { Toaster } from "@/components/ui/sonner";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
```

### Step 10: Generate and run migrations

```bash
bun run db:generate
bun run db:migrate
```

---

## Auth Pages

Create pages for all auth flows with server-side session checks.

### Sign In Page

`src/app/sign-in/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/server";
import { SignIn } from "@/components/auth/sign-in";

export default async function SignInPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-dvh flex items-center justify-center p-4">
      <SignIn />
    </main>
  );
}
```

### Sign Up Page

`src/app/sign-up/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/server";
import { SignUp } from "@/components/auth/sign-up";

export default async function SignUpPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-dvh flex items-center justify-center p-4">
      <SignUp />
    </main>
  );
}
```

### Forgot Password Page

`src/app/forgot-password/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/server";
import { ForgotPassword } from "@/components/auth/forgot-password";

export default async function ForgotPasswordPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-dvh flex items-center justify-center p-4">
      <ForgotPassword />
    </main>
  );
}
```

### Reset Password Page

`src/app/reset-password/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/server";
import { ResetPassword } from "@/components/auth/reset-password";

type SearchParams = Promise<{ token?: string; error?: string }>;

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect("/dashboard");
  }

  const { token, error } = await searchParams;

  return (
    <main className="min-h-dvh flex items-center justify-center p-4">
      <ResetPassword token={token ?? null} error={error ?? null} />
    </main>
  );
}
```

---

## UI Components

### Sign In Component

`src/components/auth/sign-in.tsx`:

This component handles email/password sign-in and includes inline resend verification when `requireEmailVerification` is enabled. When a user tries to sign in without verifying their email, they see an inline alert with a resend option instead of being stuck.

```tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { Loader2, AlertCircle, Send } from "lucide-react";
import { signIn, authClient } from "@/lib/auth/client";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [emailNotVerified, setEmailNotVerified] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const router = useRouter();

  const handleResendVerification = async () => {
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    setResendLoading(true);
    try {
      const { error } = await authClient.sendVerificationEmail({
        email,
        callbackURL: "/sign-in",
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Verification email sent! Please check your inbox.");
    } finally {
      setResendLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailNotVerified(false);

    await signIn.email(
      { email, password, rememberMe, callbackURL: "/dashboard" },
      {
        onRequest: () => setLoading(true),
        onResponse: () => setLoading(false),
        onError: (ctx) => {
          const errorMessage = ctx.error.message.toLowerCase();
          if (
            errorMessage.includes("email not verified") ||
            errorMessage.includes("verify your email")
          ) {
            setEmailNotVerified(true);
          } else {
            toast.error(ctx.error.message);
          }
        },
        onSuccess: () => router.push("/dashboard"),
      },
    );
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
        <CardDescription>Enter your email below to login</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {emailNotVerified && (
          <div className="rounded-lg border border-amber-600/30 bg-amber-950/50 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="size-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-2">
                <p className="font-medium text-amber-200">Email not verified</p>
                <p className="text-sm text-amber-200/70">
                  Please verify your email address before signing in.
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-fit text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 px-0"
                  onClick={handleResendVerification}
                  disabled={resendLoading}
                >
                  {resendLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  Resend verification email
                </Button>
              </div>
            </div>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link href="/forgot-password" className="text-sm underline">
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="remember"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked === true)}
            />
            <Label htmlFor="remember" className="text-sm font-normal">
              Remember me
            </Label>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : "Sign in"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center border-t pt-4">
        <p className="text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link href="/sign-up" className="underline">
            Sign up
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
```

> **Note:** When `requireEmailVerification: true` is set in the server config, users cannot sign in until they verify their email. The inline resend option provides a smooth UX for users who haven't verified yet.

### Sign Up Component

`src/components/auth/sign-up.tsx`:

```tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { signUp } from "@/lib/auth/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function SignUp() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    await signUp.email(
      { email, password, name },
      {
        onRequest: () => setLoading(true),
        onResponse: () => setLoading(false),
        onError: (ctx) => {
          toast.error(ctx.error.message);
        },
        onSuccess: () => {
          setSuccess(true);
          toast.success("Check your email to verify your account");
        },
      },
    );
  };

  if (success) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            We've sent a verification link to <strong>{email}</strong>
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Button variant="outline" onClick={() => router.push("/sign-in")}>
            Back to sign in
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>Enter your details to get started</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Create account"
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center border-t pt-4">
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/sign-in" className="underline">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
```

### Forgot Password Component

`src/components/auth/forgot-password.tsx`:

```tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { toast } from "sonner";
import Link from "next/link";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await authClient.forgetPassword({
      email,
      redirectTo: "/reset-password",
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    setSuccess(true);
  };

  if (success) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            If an account exists for {email}, we've sent password reset
            instructions.
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Link href="/sign-in">
            <Button variant="outline">Back to sign in</Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Forgot password?</CardTitle>
        <CardDescription>
          Enter your email and we'll send you a reset link
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Send reset link"
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center border-t pt-4">
        <Link href="/sign-in">
          <Button variant="ghost">Back to sign in</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
```

### Reset Password Component

`src/components/auth/reset-password.tsx`:

```tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";

type ResetPasswordProps = {
  token: string | null;
  error: string | null;
};

export function ResetPassword({ token, error }: ResetPasswordProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  if (error || !token) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Invalid link</CardTitle>
          <CardDescription>
            This password reset link is invalid or has expired.
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Link href="/forgot-password">
            <Button>Request new link</Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    const { error } = await authClient.resetPassword({
      newPassword: password,
      token,
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    setSuccess(true);
    toast.success("Password reset successfully!");
  };

  if (success) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Password reset!</CardTitle>
          <CardDescription>
            You can now sign in with your new password.
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Button onClick={() => router.push("/sign-in")}>Sign in</Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Set new password</CardTitle>
        <CardDescription>Enter your new password below</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Reset password"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

---

## Usage

### Sign Up

```typescript
import { signUp } from "@/lib/auth/client";

await signUp.email({
  email: "user@example.com",
  password: "securepassword",
  name: "John Doe",
});
```

### Sign In

```typescript
import { signIn } from "@/lib/auth/client";

await signIn.email({
  email: "user@example.com",
  password: "securepassword",
});
```

### Sign Out

```typescript
import { signOut } from "@/lib/auth/client";

await signOut();
```

### Forgot Password

```typescript
import { authClient } from "@/lib/auth/client";

await authClient.forgetPassword({
  email: "user@example.com",
  redirectTo: "/reset-password",
});
```

### Reset Password

```typescript
import { authClient } from "@/lib/auth/client";

await authClient.resetPassword({
  newPassword: "newSecurePassword",
  token: "token-from-url",
});
```

### Send Verification Email

```typescript
import { authClient } from "@/lib/auth/client";

await authClient.sendVerificationEmail({
  email: "user@example.com",
  callbackURL: "/dashboard",
});
```

### Change Email

```typescript
import { authClient } from "@/lib/auth/client";

await authClient.changeEmail({
  newEmail: "newemail@example.com",
  callbackURL: "/profile",
});
```

### Change Password

```typescript
import { authClient } from "@/lib/auth/client";

await authClient.changePassword({
  currentPassword: "oldPassword",
  newPassword: "newPassword",
  revokeOtherSessions: true,
});
```

### Delete Account

```typescript
import { authClient } from "@/lib/auth/client";

await authClient.deleteUser({
  password: "password",
  callbackURL: "/",
});
```

### Update User Profile

```typescript
import { authClient } from "@/lib/auth/client";

await authClient.updateUser({
  name: "New Name",
  image: "https://example.com/avatar.jpg",
});
```

### Revoke Other Sessions

```typescript
import { authClient } from "@/lib/auth/client";

await authClient.revokeOtherSessions();
```

### Get Session (Client)

```tsx
"use client";

import { useSession } from "@/lib/auth/client";

export function UserProfile() {
  const { data: session, isPending } = useSession();

  if (isPending) return <div>Loading...</div>;
  if (!session) return <div>Not signed in</div>;

  return <div>Hello, {session.user.name}</div>;
}
```

### Get Session (Server)

```typescript
import { auth } from "@/lib/auth/server";
import { headers } from "next/headers";

export default async function Page() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return <div>Not signed in</div>;
  }

  return <div>Hello, {session.user.name}</div>;
}
```

### Protected Page Pattern

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

---

## File Structure

```
src/lib/auth/
  config.ts    # Environment validation
  schema.ts    # Auto-generated by Better Auth CLI
  server.tsx   # Better Auth server instance
  client.ts    # React client hooks
  emails/
    forgot-password.tsx
    verify-email.tsx
    change-email.tsx
    delete-account.tsx

src/components/auth/
  sign-in.tsx
  sign-up.tsx
  forgot-password.tsx
  reset-password.tsx

src/app/
  sign-in/page.tsx
  sign-up/page.tsx
  forgot-password/page.tsx
  reset-password/page.tsx
```

---

## Adding Social Providers

To add OAuth providers like GitHub or Google:

```typescript
// src/lib/auth/server.tsx
export const auth = betterAuth({
  // ...existing config
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
});
```

Then use on the client:

```typescript
await signIn.social({ provider: "github" });
```

---

## References

- [Better Auth Documentation](https://www.better-auth.com/)
- [Better Auth Drizzle Adapter](https://www.better-auth.com/docs/adapters/drizzle)
- [Better Auth Plugins](https://www.better-auth.com/docs/plugins)
