# Template - Neon Agent Workflow Persistence

Persist AI SDK messages to your Neon database.

## Stack

- Full-stack framework: **Next.js**
- ORM: **Drizzle**
- Agent runtime: **Workflow Development Kit**
- Agent framework: **AI SDK v6**
- UI components: **Shadcn & AI Elements**
- Database: **Neon Serverless Postgres**
- TypeScript runtime & package manager: **Bun**

## Getting Started

Click the "Deploy" button to clone this repository, create a new Vercel project, set up the Neon integration, and provision a new Neon database:

[![Deploy to Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fneondatabase-labs%2Fvercel-marketplace-neon%2Ftree%2Fmain&project-name=my-vercel-neon-app&repository-name=my-vercel-neon-app&products=[{%22type%22:%22integration%22,%22integrationSlug%22:%22neon%22,%22productSlug%22:%22neon%22,%22protocol%22:%22storage%22}])

Once the process is complete, you can clone the newly created GitHub repository and start making changes locally.

## Local Setup

1. Install dependencies:

```bash
bun i
```

2. Create a `.env` file in the project root

```bash
cp .env.example .env
```

3. Get your Neon database URL

Run `vercel env pull` to fetch the environment variables from your Vercel project.

Alternatively, obtain the database connection string from the Connection Details widget on the [Neon Dashboard](https://console.neon.tech/) and update the `.env` file with your database connection string:

```txt
DATABASE_URL=<your-string-here>
```

4. Get your Vercel AI Gateway API Key

Create a new Vercel AI Gateway API Key [here](https://vercel.com/ai-gateway) and add it to your `.env` file:

```txt
AI_GATEWAY_API_KEY=<your-string-here>
```

Alternatively, you can follow the [AI SDK provider docs](https://ai-sdk.dev/providers/ai-sdk-providers) and modify the model serving in the code to use a different provider instead of Vercel AI Gateway.

5. Run the development server

```bash
bun run dev
```

## Setup From Scratch

Follow these steps to integrate this setup into your existing application or to build it from scratch.

1. Create a new [Next.js](https://nextjs.org/) app

```bash
bunx create-next-app@latest
```

2. Set up Shadcn

```bash
bunx --bun shadcn@latest init
bunx --bun shadcn@latest add --all
```

For details, refer to the [Shadcn Next.js docs](https://ui.shadcn.com/docs/installation/next).

Optionally, add dark mode:

```bash
bun add next-themes
```

Follow the [Shadcn Next.js dark mode guide](https://ui.shadcn.com/docs/dark-mode/next) to review all relevant code changes.

3. Set up Neon

On Vercel Fluid compute, we recommend using a pooled PostgreSQL connection that can be reused across requests (more details [here](https://neon.com/docs/guides/vercel-connection-methods)). This setup uses `node-postgres` with Drizzle as the ORM.

```bash
bun add drizzle-orm pg @vercel/functions
bun add -D drizzle-kit @types/pg
```

Follow the [Drizzle Postgres setup guide](https://orm.drizzle.team/docs/get-started/postgresql-new) for step-by-step instructions. Attach the database pool to your Vercel function to ensure it releases properly on function shutdown. For more information, see the [Vercel connection pooling guide](https://vercel.com/guides/connection-pooling-with-functions).

Optionally, configure the Neon MCP server by following the instructions in the [MCP server README](https://github.com/neondatabase/mcp-server-neon) or by running `bunx neonctl@latest init`.

4. Set up Workflow Development Kit

```bash
bun add workflow
```

Refer to the [Getting started on Next.js guide](https://useworkflow.dev/docs/getting-started/next) for setup instructions.

5. Install AI SDK and AI Elements

Install [AI SDK v6](https://v6.ai-sdk.dev/docs/introduction):

```bash
bun add ai@beta @ai-sdk/react@beta
bunx shadcn@latest add @ai-elements/all
```
