# Auth Template

A Next.js starter with complete authentication: Better Auth, email verification, password reset, protected routes, and account management.

Template and source code for the [Authentication](https://fullstackrecipes.com/recipes/authentication) cookbook on fullstackrecipes.

## Quick Start

1. **Clone and install:**

   ```bash
   npx tiged andrelandgraf/fullstackrecipes/templates/auth#main my-app
   cd my-app
   bun install
   ```

2. **Set up environment variables:**

   ```bash
   cp .env.example .env.development
   ```

   Edit `.env.development` with your:
   - Neon database URL (from [Neon Console](https://console.neon.tech))
   - Better Auth secret (generate with `openssl rand -base64 32`)
   - Resend API key (from [resend.com/api-keys](https://resend.com/api-keys))
   - AI Gateway API key or Vercel OIDC token

3. **Generate auth schema and run migrations:**

   ```bash
   bun run db:generate
   bun run db:migrate
   ```

4. **Start the development server:**

   ```bash
   bun run dev
   ```

## What's Included

Everything from the [Base App Template](https://fullstackrecipes.com/recipes/base-app-setup) plus:

- **Better Auth** with email/password authentication
- **Email verification** on signup
- **Password reset** flow
- **Account management** (profile, change email, change password, delete account)
- **Session management** (sign out from other devices)
- **Protected routes** with server-side session checks
- **Resend** for transactional emails
- **Styled email templates** for all auth flows

## Auth Pages

| Route              | Description                  |
| ------------------ | ---------------------------- |
| `/sign-in`         | Sign in with email/password  |
| `/sign-up`         | Create new account           |
| `/forgot-password` | Request password reset       |
| `/reset-password`  | Set new password             |
| `/verify-email`    | Verify email address         |
| `/profile`         | Account settings (protected) |

## Project Structure

```
src/
├── app/
│   ├── api/auth/[...all]/   # Better Auth API handler
│   ├── sign-in/             # Auth pages
│   ├── sign-up/
│   ├── forgot-password/
│   ├── reset-password/
│   ├── verify-email/
│   └── profile/             # Protected account settings
├── components/
│   ├── auth/                # Auth UI components
│   │   ├── sign-in.tsx
│   │   ├── sign-up.tsx
│   │   ├── forgot-password.tsx
│   │   ├── reset-password.tsx
│   │   ├── verify-email-result.tsx
│   │   └── user-menu.tsx
│   └── profile/             # Profile components
│       ├── profile-header.tsx
│       ├── change-email.tsx
│       ├── change-password.tsx
│       ├── sessions.tsx
│       ├── resend-verification.tsx
│       └── delete-account.tsx
└── lib/
    ├── auth/                # Auth library
    │   ├── config.ts        # Auth config
    │   ├── client.ts        # Client hooks
    │   ├── server.tsx       # Better Auth instance
    │   └── emails/          # Email templates
    └── resend/              # Resend email library
        ├── config.ts
        ├── client.ts
        └── send.ts
```

## Scripts

| Command               | Description                               |
| --------------------- | ----------------------------------------- |
| `bun run dev`         | Start development server                  |
| `bun run build`       | Build for production                      |
| `bun run db:generate` | Generate auth schema + Drizzle migrations |
| `bun run db:migrate`  | Run database migrations                   |
| `bun run db:studio`   | Open Drizzle Studio                       |

## Learn More

- [fullstackrecipes.com](https://fullstackrecipes.com) - Recipes and cookbooks
- [Better Auth](https://www.better-auth.com) - Authentication library
- [Resend](https://resend.com) - Transactional email API
