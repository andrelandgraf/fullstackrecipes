# Base App Template

A Next.js starter with Shadcn UI, Neon Postgres, Drizzle ORM, and AI SDK.

Built with the [Base App Setup](https://fullstackrecipes.com/recipes/base-app-setup) cookbook from fullstackrecipes.

## Quick Start

1. **Clone and install:**

   ```bash
   npx tiged fullstackrecipes/s2-ai-chat/templates/base-app my-app
   cd my-app
   bun install
   ```

2. **Set up environment variables:**

   ```bash
   cp .env.example .env.development
   ```

   Edit `.env.development` with your:
   - Neon database URL (from [Neon Console](https://console.neon.tech))
   - AI Gateway API key or Vercel OIDC token

3. **Run database migrations:**

   ```bash
   bun run db:generate
   bun run db:migrate
   ```

4. **Start the development server:**

   ```bash
   bun run dev
   ```

## What's Included

- **Next.js 16** with App Router and React Compiler
- **Shadcn UI** with all components and dark mode
- **Tailwind CSS v4** with CSS variables
- **Drizzle ORM** with Neon Postgres
- **AI SDK** with streaming chat
- **TypeScript** with strict mode
- **Prettier** for code formatting
- **Bun** as runtime and package manager

## Project Structure

```
src/
├── app/           # Next.js App Router pages and API routes
├── components/    # React components organized by feature
│   ├── themes/    # Theme provider and selector
│   └── ui/        # Shadcn UI components
├── hooks/         # Custom React hooks
└── lib/           # Feature libraries
    ├── ai/        # AI configuration
    ├── common/    # Shared utilities (assert, etc.)
    ├── config/    # Environment config schema
    └── db/        # Database client and config
```

## Scripts

| Command               | Description                 |
| --------------------- | --------------------------- |
| `bun run dev`         | Start development server    |
| `bun run build`       | Build for production        |
| `bun run start`       | Start production server     |
| `bun run typecheck`   | Run TypeScript checks       |
| `bun run fmt`         | Format code with Prettier   |
| `bun run db:generate` | Generate Drizzle migrations |
| `bun run db:migrate`  | Run database migrations     |
| `bun run db:studio`   | Open Drizzle Studio         |

## Learn More

- [fullstackrecipes.com](https://fullstackrecipes.com) - Recipes and cookbooks
- [Next.js Documentation](https://nextjs.org/docs)
- [Shadcn UI](https://ui.shadcn.com)
- [Drizzle ORM](https://orm.drizzle.team)
- [AI SDK](https://ai-sdk.dev)
