import {
  Database,
  MessageSquare,
  Bot,
  CreditCard,
  Rocket,
  Settings,
  KeyRound,
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
};

export const recipes: Recipe[] = [
  {
    slug: "base-app-setup",
    title: "Base App Setup",
    description:
      "Complete setup guide for a Next.js app with Shadcn UI, Neon PostgreSQL, Drizzle ORM, and AI SDK.",
    tags: ["Setup", "Next.js", "Full Stack"],
    icon: Rocket,
    sections: [
      "setup-nextjs.md",
      "setup-shadcn.md",
      "env-config.md",
      "setup-neon-env.md",
      "drizzle-with-node-postgres.md",
      "setup-ai-sdk.md",
      "setup-simple-chat.md",
    ],
    includes: ["env-config", "neon-drizzle-setup"],
  },
  {
    slug: "env-config",
    title: "Environment Variable Management",
    description:
      "Type-safe environment variable validation using Zod with a modular config pattern for clean, maintainable configuration.",
    tags: ["Config", "TypeScript", "Zod"],
    icon: Settings,
    sections: ["env-config.md"],
  },
  {
    slug: "neon-drizzle-setup",
    title: "Neon + Drizzle Setup",
    description:
      "Set up a PostgreSQL database with Neon and Drizzle ORM for type-safe database queries in your Next.js app.",
    tags: ["Database", "ORM", "Postgres"],
    icon: Database,
    sections: ["drizzle-with-node-postgres.md"],
    requires: ["env-config"],
  },
  {
    slug: "ai-chat-persistence",
    title: "AI Chat Persistence with Neon",
    description:
      "Persist AI SDK messages to Neon PostgreSQL with full support for tools, reasoning, and streaming. Uses UUID v7 for chronological ordering.",
    tags: ["AI", "Neon", "Drizzle", "Streaming"],
    icon: MessageSquare,
    sections: [
      "chat-schema.md",
      "chat-persistence-layer.md",
      "chat-component-integration.md",
      "chat-history-hydration.md",
    ],
    requires: ["neon-drizzle-setup"],
  },
  {
    slug: "ai-agent-workflow",
    title: "AI Agent Workflow",
    description:
      "Build multi-step AI agents with custom tool loops. Create autonomous workflows that reason and act on your behalf.",
    tags: ["AI", "Agents", "Tools"],
    icon: Bot,
    sections: [
      "agent-tools.md",
      "agent-loop.md",
      "agent-api-route.md",
      "agent-streaming.md",
    ],
  },
  {
    slug: "stripe-sync",
    title: "Stripe Subscriptions DB Sync",
    description:
      "Complete subscription system with Stripe, Vercel Flags for plan configuration, webhook handling, usage tracking, and billing portal integration.",
    tags: ["Payments", "Subscriptions", "Webhooks", "Database"],
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
    requires: ["neon-drizzle-setup"],
  },
  {
    slug: "custom-durable-agent",
    title: "Custom Durable Agent",
    description:
      "Build a custom durable AI agent with full control over streamText options, provider configs, and tool loops. Compatible with the Workflow Development Kit.",
    tags: ["AI", "Agents", "Workflow", "Streaming"],
    icon: Bot,
    sections: ["custom-durable-agent.md"],
    requires: ["ai-agent-workflow"],
  },
  {
    slug: "better-auth-setup",
    title: "Better Auth Setup",
    description:
      "Add user authentication to your Next.js app using Better Auth with Drizzle ORM and Neon PostgreSQL. Supports email/password and social providers.",
    tags: ["Auth", "Users", "Neon", "Drizzle"],
    icon: KeyRound,
    sections: ["better-auth-setup.md"],
    requires: ["neon-drizzle-setup"],
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
