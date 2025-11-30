## Better Auth Setup

Add user authentication to your Next.js app using Better Auth with Drizzle ORM and Neon PostgreSQL.

### Why Better Auth?

- **Type-safe**: Full TypeScript support with inferred types
- **Drizzle native**: First-class Drizzle adapter, no schema duplication
- **Flexible**: Email/password, social providers, passkeys, magic links via plugins
- **Modern**: Built for React 19, Server Components, and the App Router

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
import { validateConfig, type PreValidate } from "../config/utils";

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

Add it to `src/lib/config/server.ts`:

```typescript
import { databaseConfig } from "../db/config";
import { aiConfig } from "../ai/config";
import { authConfig } from "../auth/config";

export const serverConfig = {
  database: databaseConfig,
  ai: aiConfig,
  auth: authConfig,
} as const;
```

### Step 4: Create the auth schema

Create `src/lib/auth/schema.ts` with the Better Auth tables:

```typescript
import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type Verification = typeof verifications.$inferSelect;
export type NewVerification = typeof verifications.$inferInsert;
```

Add the schema export to `src/lib/db/schema.ts`:

```typescript
export * from "@/lib/chat/schema";
export * from "@/lib/auth/schema";
```

### Step 5: Create the auth server instance

Create `src/lib/auth/server.tsx` (uses `.tsx` extension for JSX in email templates):

```typescript
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/client";
import { authConfig } from "./config";
import { sendEmail } from "../resend/send";
import { ForgotPasswordEmail } from "./emails/forgot-password";
import * as schema from "./schema";

export const auth = betterAuth({
  secret: authConfig.secret,
  baseURL: authConfig.url,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
    async sendResetPassword({ user, url }) {
      await sendEmail({
        to: user.email,
        subject: "Reset Your Password",
        react: <ForgotPasswordEmail resetLink={url} />,
      });
    },
  },
});
```

> **Note:** This requires [Resend Setup](/recipes/setup-resend) for email delivery.

### Step 6: Create the API route handler

Create `src/app/api/auth/[...all]/route.ts`:

```typescript
import { auth } from "@/lib/auth/server";
import { toNextJsHandler } from "better-auth/next-js";

export const { POST, GET } = toNextJsHandler(auth);
```

### Step 7: Create the auth client

Create `src/lib/auth/client.ts`:

```typescript
"use client";

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;
```

### Step 8: Generate and run migrations

```bash
bun run db:generate
bun run db:migrate
```

---

## Usage

### Sign Up

```typescript
import { signUp } from "@/lib/auth/client";

const { data, error } = await signUp.email({
  email: "user@example.com",
  password: "securepassword",
  name: "John Doe",
});
```

### Sign In

```typescript
import { signIn } from "@/lib/auth/client";

const { data, error } = await signIn.email({
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

Request a password reset email:

```typescript
import { authClient } from "@/lib/auth/client";

const { error } = await authClient.forgetPassword({
  email: "user@example.com",
  redirectTo: "/reset-password",
});
```

Reset the password with the token from the email:

```typescript
import { authClient } from "@/lib/auth/client";

const { error } = await authClient.resetPassword({
  newPassword: "newSecurePassword",
});
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

---

## File Structure

Following the [Architecture Decisions](/recipes/architecture-decisions), all auth code lives in `src/lib/auth/`:

```
src/lib/auth/
  config.ts    # Environment validation
  schema.ts    # Drizzle table definitions
  server.tsx   # Better Auth server instance (JSX for email templates)
  client.ts    # React client hooks
  emails/
    forgot-password.tsx    # Password reset email template

src/components/auth/
  sign-in.tsx  # Sign in form component
  sign-up.tsx  # Sign up form component
```

---

## UI Components

Pre-built sign-in and sign-up components using shadcn/ui.

### Sign In Component

Create `src/components/auth/sign-in.tsx`:

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
import { Loader2 } from "lucide-react";
import { signIn } from "@/lib/auth/client";
import Link from "next/link";

export function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle className="text-lg md:text-xl">Sign In</CardTitle>
        <CardDescription className="text-xs md:text-sm">
          Enter your email below to login to your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              required
              onChange={(e) => {
                setEmail(e.target.value);
              }}
              value={email}
            />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="ml-auto inline-block text-sm underline"
              >
                Forgot your password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="remember"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked === true)}
            />
            <Label htmlFor="remember">Remember me</Label>
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={loading}
            onClick={async () => {
              await signIn.email(
                {
                  email,
                  password,
                  rememberMe,
                },
                {
                  onRequest: () => {
                    setLoading(true);
                  },
                  onResponse: () => {
                    setLoading(false);
                  },
                },
              );
            }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : "Login"}
          </Button>
        </div>
      </CardContent>
      <CardFooter>
        <div className="flex justify-center w-full border-t py-4">
          <p className="text-center text-xs text-neutral-500">
            Don&apos;t have an account?{" "}
            <Link href="/sign-up" className="underline">
              Sign up
            </Link>
          </p>
        </div>
      </CardFooter>
    </Card>
  );
}
```

### Sign Up Component

Create `src/components/auth/sign-up.tsx`:

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
import Image from "next/image";
import { Loader2, X } from "lucide-react";
import { signUp } from "@/lib/auth/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function SignUp() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle className="text-lg md:text-xl">Sign Up</CardTitle>
        <CardDescription className="text-xs md:text-sm">
          Enter your information to create an account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="first-name">First name</Label>
              <Input
                id="first-name"
                placeholder="Max"
                required
                onChange={(e) => {
                  setFirstName(e.target.value);
                }}
                value={firstName}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="last-name">Last name</Label>
              <Input
                id="last-name"
                placeholder="Robinson"
                required
                onChange={(e) => {
                  setLastName(e.target.value);
                }}
                value={lastName}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              required
              onChange={(e) => {
                setEmail(e.target.value);
              }}
              value={email}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="Password"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password_confirmation">Confirm Password</Label>
            <Input
              id="password_confirmation"
              type="password"
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              autoComplete="new-password"
              placeholder="Confirm Password"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="image">Profile Image (optional)</Label>
            <div className="flex items-end gap-4">
              {imagePreview && (
                <div className="relative w-16 h-16 rounded-sm overflow-hidden">
                  <Image
                    src={imagePreview}
                    alt="Profile preview"
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="flex items-center gap-2 w-full">
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full"
                />
                {imagePreview && (
                  <X
                    className="cursor-pointer"
                    onClick={() => {
                      setImage(null);
                      setImagePreview(null);
                    }}
                  />
                )}
              </div>
            </div>
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={loading}
            onClick={async () => {
              if (password !== passwordConfirmation) {
                toast.error("Passwords do not match");
                return;
              }
              await signUp.email({
                email,
                password,
                name: `${firstName} ${lastName}`,
                image: image ? await convertImageToBase64(image) : "",
                callbackURL: "/",
                fetchOptions: {
                  onResponse: () => {
                    setLoading(false);
                  },
                  onRequest: () => {
                    setLoading(true);
                  },
                  onError: (ctx) => {
                    toast.error(ctx.error.message);
                  },
                  onSuccess: async () => {
                    router.push("/");
                  },
                },
              });
            }}
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              "Create an account"
            )}
          </Button>
        </div>
      </CardContent>
      <CardFooter>
        <div className="flex justify-center w-full border-t py-4">
          <p className="text-center text-xs text-neutral-500">
            Already have an account?{" "}
            <Link href="/sign-in" className="underline">
              Sign in
            </Link>
          </p>
        </div>
      </CardFooter>
    </Card>
  );
}

async function convertImageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
```

### Using the Components

Create pages that use these components:

```tsx
// src/app/sign-in/page.tsx
import { SignIn } from "@/components/auth/sign-in";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn />
    </div>
  );
}
```

```tsx
// src/app/sign-up/page.tsx
import { SignUp } from "@/components/auth/sign-up";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignUp />
    </div>
  );
}
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
