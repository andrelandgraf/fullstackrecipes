import {
  Database,
  MessageSquare,
  Bot,
  CreditCard,
  Rocket,
  Settings,
  KeyRound,
  Mail,
  Flag,
} from "lucide-react";

export type Recipe = {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  icon: typeof Database;
  sections: string[];
  /** Slugs of recipes that are bundled/included in this recipe */
  includes?: string[];
  /** Slugs of recipes that should be completed before this one */
  requires?: string[];
  /** Code snippet to display in the OG image preview */
  previewCode: string;
  /** Registry items that can be installed via shadcn CLI */
  registryDeps?: string[];
};

// Ordered in order of setup requirements/requisites
export const recipes: Recipe[] = [
  {
    slug: "base-app-setup",
    title: "Base App Setup",
    description:
      "Complete setup guide for a Next.js app with Shadcn UI, Neon Postgres, Drizzle ORM, and AI SDK.",
    tags: [],
    icon: Rocket,
    sections: [
      "setup-nextjs.md",
      "agents-setup.md",
      "setup-shadcn.md",
      "env-config.md",
      "setup-neon-env.md",
      "drizzle-with-node-postgres.md",
      "setup-ai-sdk.md",
      "setup-simple-chat.md",
    ],
    includes: ["agent-setup", "env-config", "neon-drizzle-setup"],
    previewCode: `bunx create-next-app@latest my-app
bunx shadcn@latest init
bun add drizzle-orm @ai-sdk/openai`,
  },
  {
    slug: "agent-setup",
    title: "AI Coding Agent Configuration",
    description:
      "Configure AI coding agents like Cursor or GitHub Copilot with project-specific patterns, coding guidelines, and MCP servers.",
    tags: ["Config"],
    icon: Bot,
    sections: ["agents-setup.md"],
    previewCode: `{
  "mcpServers": {
    "next-devtools": {
      "command": "npx",
      "args": ["-y", "next-devtools-mcp@latest"]
    },
    "context7": {
      "url": "https://mcp.context7.com/mcp"
    }
  }
}`,
  },
  {
    slug: "env-config",
    title: "Environment Variable Management",
    description:
      "Type-safe environment variable validation using Zod with a modular config pattern for clean, maintainable configuration.",
    tags: ["Config"],
    icon: Settings,
    sections: ["env-config.md"],
    previewCode: `const DatabaseConfigSchema = z.object({
  url: z.string("DATABASE_URL must be defined."),
});

export const databaseConfig = validateConfig(
  DatabaseConfigSchema, { url: process.env.DATABASE_URL }
);`,
    registryDeps: ["validate-config"],
  },
  {
    slug: "neon-drizzle-setup",
    title: "Neon + Drizzle Setup",
    description:
      "Set up a Postgres database with Neon and Drizzle ORM for type-safe database queries in your Next.js app.",
    tags: ["Neon", "Drizzle"],
    icon: Database,
    sections: ["drizzle-with-node-postgres.md"],
    requires: ["env-config"],
    previewCode: `import { drizzle } from "drizzle-orm/node-postgres";
import { attachDatabasePool } from "@vercel/functions";

const pool = new Pool({ connectionString: databaseConfig.url });
attachDatabasePool(pool);
export const db = drizzle({ client: pool, schema });`,
  },
  {
    slug: "resend-setup",
    title: "Resend Setup",
    description:
      "Set up Resend for transactional emails like password resets and email verification.",
    tags: ["Email"],
    icon: Mail,
    sections: ["setup-resend.md"],
    requires: ["env-config"],
    previewCode: `export async function sendEmail({ to, subject, react }) {
  const { data, error } = await resend.emails.send({
    from: resendConfig.fromEmail,
    to: Array.isArray(to) ? to : [to],
    subject,
    react,
  });
}`,
  },
  {
    slug: "better-auth-setup",
    title: "Better Auth Setup",
    description:
      "Add user authentication to your Next.js app using Better Auth with Drizzle ORM and Neon Postgres. Supports email/password and social providers.",
    tags: ["Auth", "Neon", "Drizzle"],
    icon: KeyRound,
    sections: ["better-auth-setup.md"],
    requires: ["neon-drizzle-setup", "resend-setup"],
    previewCode: `export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
});`,
  },
  {
    slug: "feature-flags-setup",
    title: "Feature Flags with Flags SDK",
    description:
      "Implement feature flags using the Vercel Flags SDK with server-side evaluation, environment-based toggles, and Vercel Toolbar integration.",
    tags: ["Config", "Vercel"],
    icon: Flag,
    sections: ["feature-flags-setup.md"],
    previewCode: `export const stripeFlag = flag({
  key: "stripe-enabled",
  decide() {
    return Boolean(process.env.STRIPE_SECRET_KEY);
  },
});`,
  },
  {
    slug: "ai-chat-persistence",
    title: "AI Chat Persistence with Neon",
    description:
      "Persist AI SDK messages to Neon Postgres with full support for tools, reasoning, and streaming. Uses UUID v7 for chronological ordering.",
    tags: ["AI", "Neon", "Drizzle", "Streaming"],
    icon: MessageSquare,
    sections: [
      "chat-schema.md",
      "chat-persistence-layer.md",
      "chat-component-integration.md",
      "chat-history-hydration.md",
    ],
    requires: ["better-auth-setup"],
    previewCode: `export const chats = pgTable("chats", {
  id: uuid("id").primaryKey()
    .default(sql\`uuid_generate_v7()\`),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});`,
  },
  {
    slug: "stripe-sync",
    title: "Stripe Subscriptions DB Sync",
    description:
      "Complete subscription system with Stripe, Vercel Flags for plan configuration, webhook handling, usage tracking, and billing portal integration.",
    tags: ["Stripe", "Neon", "Drizzle"],
    icon: CreditCard,
    sections: [
      "stripe-overview.md",
      "stripe-schema.md",
      "stripe-client-plans.md",
      "stripe-customer-checkout.md",
      "stripe-webhooks.md",
      "stripe-billing-usage.md",
      "stripe-ui.md",
      "stripe-deployment.md",
    ],
    requires: ["neon-drizzle-setup", "feature-flags-setup"],
    previewCode: `export async function syncStripeData(customerId: string) {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    expand: ["data.default_payment_method"],
  });
  await upsertSubscription(userId, subscriptionData);
}`,
  },
  {
    slug: "ai-agent-workflow",
    title: "Resumable AI Agent Workflows",
    description:
      "Build resumable AI agent workflows with durable execution, tool loops, and automatic stream recovery on client reconnection.",
    tags: ["AI", "Agents", "Workflow Dev Kit", "Streaming"],
    icon: Bot,
    sections: [
      "setup-workflow.md",
      "workflow-types.md",
      "workflow-tools.md",
      "workflow-definition.md",
      "workflow-steps.md",
      "workflow-api-routes.md",
      "workflow-client.md",
      "workflow-concepts.md",
    ],
    requires: ["ai-chat-persistence"],
    includes: ["custom-durable-agent"],
    previewCode: `export async function chatWorkflow({ chatId, userMessage }) {
  "use workflow";
  const { workflowRunId } = getWorkflowMetadata();
  const history = await getMessageHistory(chatId);
  const { parts } = await agent.run(history, {
    writable: getWritable(),
  });
}`,
    registryDeps: ["use-resumable-chat"],
  },
  {
    slug: "custom-durable-agent",
    title: "Custom Durable Agent",
    description:
      "Build a custom durable AI agent with full control over streamText options, provider configs, and tool loops. Compatible with the Workflow Development Kit.",
    tags: ["AI", "Agents", "Workflow Dev Kit", "Streaming"],
    icon: Bot,
    sections: ["custom-durable-agent.md"],
    requires: ["ai-agent-workflow"],
    previewCode: `const { parts } = await researchAgent.run(history, {
  maxSteps: 10,
  writable: getWritable(),
});

// Tool loop continues until finishReason !== "tool-calls"`,
    registryDeps: ["durable-agent"],
  },
];

export function getRecipeBySlug(slug: string): Recipe | undefined {
  return recipes.find((r) => r.slug === slug);
}

export function getAllRecipes(): Recipe[] {
  return recipes;
}

export function getRecipesBySlugs(slugs: string[]): Recipe[] {
  return slugs
    .map((slug) => recipes.find((r) => r.slug === slug))
    .filter((r): r is Recipe => r !== undefined);
}

export function getIncludedRecipes(recipe: Recipe): Recipe[] {
  return getRecipesBySlugs(recipe.includes ?? []);
}

export function getRequiredRecipes(recipe: Recipe): Recipe[] {
  return getRecipesBySlugs(recipe.requires ?? []);
}
