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
  Paintbrush,
  Palette,
  Sparkles,
  Layers,
  RefreshCw,
  BookOpen,
  Cog,
  Blocks,
  Package,
  Cpu,
} from "lucide-react";
import registry from "../../../registry.json";

export type Recipe = {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  icon: typeof Database;
  sections: string[];
  /** Slugs of recipes that should be completed before this one */
  requires?: string[];
  /** Code snippet to display in the OG image preview */
  previewCode: string;
  /** Registry items that can be installed via shadcn CLI */
  registryDeps?: string[];
};

export type Cookbook = Recipe & {
  /** Marks this as a cookbook - a curated collection of recipes */
  isCookbook: true;
  /** Ordered list of recipe slugs included in this cookbook */
  recipes: string[];
};

// All items ordered by setup requirements/prerequisites
// Cookbooks and recipes are in the same array to enforce display order
export const items: (Recipe | Cookbook)[] = [
  // === COOKBOOKS ===
  {
    slug: "base-app-setup",
    title: "Base App Setup",
    description:
      "Complete setup guide for a Next.js app with Shadcn UI, Neon Postgres, Drizzle ORM, and AI SDK.",
    tags: ["Cookbook"],
    icon: Rocket,
    isCookbook: true,
    recipes: [
      "code-style-setup",
      "agent-setup",
      "shadcn-ui-setup",
      "assert",
      "env-config",
      "neon-drizzle-setup",
      "ai-sdk-setup",
    ],
    sections: [
      "setup-nextjs.md",
      "setup-code-style.md",
      "agents-setup.md",
      "assert.md",
      "env-config.md",
      "drizzle-with-node-postgres.md",
      "setup-shadcn.md",
      "setup-ai-sdk.md",
      "setup-simple-chat.md",
    ],
    previewCode: `bunx create-next-app@latest my-app
bunx shadcn@latest init
bun add drizzle-orm @ai-sdk/openai`,
  } satisfies Cookbook,
  // === RECIPES ===
  {
    slug: "code-style-setup",
    title: "Editor and Linting Setup",
    description:
      "Configure Prettier for code formatting, TypeScript for typechecking, and editor settings for consistent code style across your team.",
    tags: ["Config"],
    icon: Paintbrush,
    sections: ["setup-code-style.md"],
    previewCode: `{
  "editor.formatOnSave": true,
  "[typescript][javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}`,
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
    slug: "assert",
    title: "Assertion Helper",
    description:
      "TypeScript assertion function for runtime type narrowing with descriptive error messages. Based on tiny-invariant.",
    tags: ["Config"],
    icon: Settings,
    sections: ["assert.md"],
    previewCode: `import assert from "@/lib/common/assert";

function processUser(user: User | null) {
  assert(user, "User must exist");
  // TypeScript now knows user is User
  console.log(user.name);
}`,
    registryDeps: ["assert"],
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
    slug: "shadcn-ui-setup",
    title: "Shadcn UI & Theming",
    description:
      "Set up Shadcn UI components with dark mode support using next-themes. Includes theme provider setup and CSS variables configuration.",
    tags: ["UI Components"],
    icon: Palette,
    sections: ["setup-shadcn.md"],
    previewCode: `bunx --bun shadcn@latest init
bunx --bun shadcn@latest add --all

// Theme provider with next-themes
<ThemeProvider attribute="class">
  {children}
</ThemeProvider>`,
  },
  {
    slug: "ai-sdk-setup",
    title: "AI SDK & Simple Chat",
    description:
      "Set up the Vercel AI SDK with AI Elements components and build a streaming chat interface with useChat hook.",
    tags: ["AI", "Streaming", "UI Components"],
    icon: Sparkles,
    sections: ["setup-ai-sdk.md", "setup-simple-chat.md"],
    requires: ["env-config", "shadcn-ui-setup"],
    previewCode: `const { messages, sendMessage, status } = useChat({
  transport: new DefaultChatTransport({
    api: "/api/chat",
  }),
});

// Stream AI responses
const result = streamText({
  model: "anthropic/claude-sonnet-4.5",
  messages: convertToModelMessages(messages),
});`,
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
    slug: "workflow-setup",
    title: "Workflow Development Kit Setup",
    description:
      "Install and configure the Workflow Development Kit for resumable, durable AI agent workflows with step-level persistence.",
    tags: ["Workflow Dev Kit", "Config"],
    icon: Layers,
    sections: ["setup-workflow.md"],
    previewCode: `import { withWorkflow } from "workflow/next";

const nextConfig: NextConfig = {
  reactCompiler: true,
};

export default withWorkflow(nextConfig);`,
  },
  {
    slug: "resumable-ai-streams",
    title: "Resumable AI Response Streams",
    description:
      "Add automatic stream recovery to AI chat with WorkflowChatTransport, start/resume API endpoints, and the useResumableChat hook.",
    tags: ["Workflow Dev Kit", "Streaming"],
    icon: RefreshCw,
    sections: ["workflow-api-routes.md", "workflow-client.md"],
    requires: ["workflow-setup"],
    previewCode: `const { messages, sendMessage } = useResumableChat({
  chatId,
  messageHistory,
  initialRunId, // Resume interrupted streams
});

// WorkflowChatTransport handles reconnection
transport: new WorkflowChatTransport({
  maxConsecutiveErrors: 5,
})`,
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
  // === COOKBOOKS (that depend on recipes above) ===
  {
    slug: "ai-agent-workflow",
    title: "Multi-Agent Workflows",
    description:
      "Build resumable multi-agent workflows with durable execution, tool loops, and automatic stream recovery on client reconnection.",
    tags: ["Cookbook", "AI", "Agents", "Workflow Dev Kit"],
    icon: BookOpen,
    isCookbook: true,
    recipes: ["workflow-setup", "resumable-ai-streams", "custom-durable-agent"],
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
    previewCode: `export async function chatWorkflow({ chatId, userMessage }) {
  "use workflow";
  const { workflowRunId } = getWorkflowMetadata();
  const history = await getMessageHistory(chatId);
  const { parts } = await agent.run(history, {
    writable: getWritable(),
  });
}`,
    registryDeps: ["use-resumable-chat"],
  } satisfies Cookbook,
];

/** All items in display order */
export function getAllItems(): (Recipe | Cookbook)[] {
  return items;
}

export function getItemBySlug(slug: string): Recipe | Cookbook | undefined {
  return items.find((item) => item.slug === slug);
}

export function getRecipeBySlug(slug: string): Recipe | undefined {
  const item = items.find((r) => r.slug === slug);
  return item && !isCookbook(item) ? item : undefined;
}

export function getCookbookBySlug(slug: string): Cookbook | undefined {
  const item = items.find((c) => c.slug === slug);
  return item && isCookbook(item) ? item : undefined;
}

export function getAllRecipes(): Recipe[] {
  return items.filter((item): item is Recipe => !isCookbook(item));
}

export function getAllCookbooks(): Cookbook[] {
  return items.filter((item): item is Cookbook => isCookbook(item));
}

export function getRecipesBySlugs(slugs: string[]): Recipe[] {
  return slugs
    .map((slug) => items.find((r) => r.slug === slug && !isCookbook(r)))
    .filter((r): r is Recipe => r !== undefined);
}

export function getCookbookRecipes(cookbook: Cookbook): Recipe[] {
  return getRecipesBySlugs(cookbook.recipes);
}

export function getRequiredItems(
  item: Recipe | Cookbook,
): (Recipe | Cookbook)[] {
  return (item.requires ?? [])
    .map((slug) => items.find((i) => i.slug === slug))
    .filter((i): i is Recipe | Cookbook => i !== undefined);
}

export function isCookbook(item: Recipe | Cookbook): item is Cookbook {
  return "isCookbook" in item && item.isCookbook === true;
}

// Registry items from registry.json
const REGISTRY_ICONS: Record<string, typeof Database> = {
  "validate-config": Cog,
  assert: Blocks,
  "use-resumable-chat": Package,
  "durable-agent": Cpu,
};

export type RegistryItem = {
  name: string;
  title: string;
  description: string;
  type: "lib" | "hook";
  icon: typeof Database;
};

export function getRegistryItems(): RegistryItem[] {
  return registry.items.map((item) => ({
    name: item.name,
    title: item.title,
    description: item.description,
    type: item.type.replace("registry:", "") as "lib" | "hook",
    icon: REGISTRY_ICONS[item.name] ?? Settings,
  }));
}
