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
  Bug,
  BarChart3,
  ScrollText,
  Activity,
  FlaskConical,
  Triangle,
  UserCog,
  ShieldCheck,
  Link2,
  List,
} from "lucide-react";
import registry from "../../../registry.json";

export type Recipe = {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  icon: typeof Database;
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
      "nextjs-on-vercel",
      "code-style-setup",
      "agent-setup",
      "shadcn-ui-setup",
      "assert",
      "config-schema-setup",
      "neon-drizzle-setup",
      "ai-sdk-setup",
    ],
    previewCode: `bunx create-next-app@latest my-app
bunx shadcn@latest init
bun add drizzle-orm @ai-sdk/openai`,
  } satisfies Cookbook,
  // === RECIPES ===
  {
    slug: "nextjs-on-vercel",
    title: "Next.js on Vercel",
    description:
      "Create a Next.js app running on Bun, configure the development environment, and deploy to Vercel with automatic deployments on push.",
    tags: ["Vercel", "Config"],
    icon: Triangle,
    previewCode: `bunx create-next-app@latest my-app
gh repo create my-app --public --source=. --push
vercel
vercel git connect`,
  },
  {
    slug: "code-style-setup",
    title: "Editor and Linting Setup",
    description:
      "Configure Prettier for code formatting and TypeScript for typechecking. Includes VSCode settings and EditorConfig for consistent code style. Skips ESLint/Biome to avoid config complexity.",
    tags: ["Config"],
    icon: Paintbrush,
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
      "Configure AI coding agents like Cursor, GitHub Copilot, or Claude Code with project-specific patterns, coding guidelines, and MCP servers for consistent AI-assisted development.",
    tags: ["Config"],
    icon: Bot,
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
    previewCode: `import assert from "@/lib/common/assert";

function processUser(user: User | null) {
  assert(user, "User must exist");
  // TypeScript now knows user is User
  console.log(user.name);
}`,
    registryDeps: ["assert"],
  },
  {
    slug: "config-schema-setup",
    title: "Config Schema Setup",
    description:
      "Type-safe environment variable validation using Zod with a Drizzle-like schema API. Supports server/public fields, feature flags, either-or constraints, and client-side protection.",
    tags: ["Config"],
    icon: Cog,
    previewCode: `export const databaseConfig = configSchema("Database", {
  url: server({ env: "DATABASE_URL" }),
});
// Type: { server: { url: string } }`,
    registryDeps: ["config-schema"],
  },
  {
    slug: "env-workflow-vercel",
    title: "Env Workflow with Vercel",
    description:
      "Manage environment variables across Vercel environments. Sync with Vercel CLI, handle local overrides, and load env vars in scripts.",
    tags: ["Config", "Vercel"],
    icon: Triangle,
    requires: ["config-schema-setup"],
    previewCode: `{
  "scripts": {
    "env:pull": "vercel env pull .env.development",
    "env:push": "vercel env push .env.development"
  }
}`,
  },
  {
    slug: "env-validation",
    title: "Environment Validation",
    description:
      "Validate environment variables on server start and before builds. Catch missing or invalid variables early with clear error messages.",
    tags: ["Config"],
    icon: FlaskConical,
    requires: ["config-schema-setup"],
    previewCode: `// instrumentation.ts - validate on start
import "./lib/db/config";

// prebuild validation
bun run env:validate --environment=production`,
    registryDeps: ["validate-env"],
  },
  {
    slug: "env-management",
    title: "Environment Variable Management",
    description:
      "Complete environment variable management with type-safe validation, Vercel dev workflow, and prebuild validation.",
    tags: ["Cookbook", "Config"],
    icon: Settings,
    isCookbook: true,
    recipes: ["config-schema-setup", "env-workflow-vercel", "env-validation"],
    previewCode: `export const databaseConfig = configSchema("Database", {
  url: server({ env: "DATABASE_URL" }),
});

// bun run env:validate --environment=production`,
    registryDeps: ["config-schema", "validate-env"],
  } satisfies Cookbook,
  {
    slug: "neon-drizzle-setup",
    title: "Neon + Drizzle Setup",
    description:
      "Connect a Next.js app to Neon Postgres using Drizzle ORM with optimized connection pooling for Vercel serverless functions.",
    tags: ["Neon", "Drizzle"],
    icon: Database,
    requires: ["config-schema-setup"],
    previewCode: `import { drizzle } from "drizzle-orm/node-postgres";
import { attachDatabasePool } from "@vercel/functions";

const pool = new Pool({ connectionString: databaseConfig.server.url });
attachDatabasePool(pool);
export const db = drizzle({ client: pool, schema });`,
  },
  {
    slug: "shadcn-ui-setup",
    title: "Shadcn UI & Theming",
    description:
      "Add Shadcn UI components with dark mode support using next-themes. Includes theme provider and CSS variables configuration.",
    tags: ["UI Components"],
    icon: Palette,
    requires: ["nextjs-on-vercel"],
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
      "Install the Vercel AI SDK with AI Elements components. Build a streaming chat interface with the useChat hook.",
    tags: ["AI", "Streaming", "UI Components"],
    icon: Sparkles,
    requires: ["config-schema-setup", "shadcn-ui-setup"],
    previewCode: `const { messages, sendMessage, status } = useChat({
  transport: new DefaultChatTransport({
    api: "/api/chat",
  }),
});

// Stream AI responses
const result = streamText({
  model: "anthropic/claude-sonnet-4.5",
  messages: await convertToModelMessages(messages),
});`,
  },
  {
    slug: "pino-logging-setup",
    title: "Pino Logging Setup",
    description:
      "Configure structured logging with Pino. Outputs human-readable colorized logs in development and structured JSON in production for log aggregation services.",
    tags: ["Logging"],
    icon: ScrollText,
    previewCode: `import { logger } from "@/lib/common/logger";

logger.info("Server started", { port: 3000 });
logger.warn("Rate limit reached", { endpoint: "/api/chat" });
logger.error(err, "Failed to process request");`,
    registryDeps: ["logger"],
  },
  {
    slug: "sentry-setup",
    title: "Sentry Setup",
    description:
      "Configure Sentry for error tracking, performance monitoring, and log aggregation. Integrates with Pino to forward logs to Sentry automatically.",
    tags: ["Monitoring"],
    icon: Bug,
    requires: ["pino-logging-setup"],
    previewCode: `Sentry.init({
  dsn: "https://your-dsn@sentry.io/project",
  integrations: [
    Sentry.pinoIntegration({
      log: { levels: ["info", "warn", "error"] }
    }),
  ],
});`,
  },
  {
    slug: "vercel-analytics-setup",
    title: "Vercel Web Analytics",
    description:
      "Add privacy-focused web analytics with Vercel Web Analytics. Track page views, visitors, and custom events with zero configuration.",
    tags: ["Monitoring", "Vercel"],
    icon: BarChart3,
    requires: ["nextjs-on-vercel"],
    previewCode: `import { Analytics } from "@vercel/analytics/next";
import { track } from "@vercel/analytics";

// Add to root layout
<Analytics />

// Track custom events
track("signup_completed", { plan: "pro" });`,
  },
  {
    slug: "observability-monitoring",
    title: "Observability & Monitoring",
    description:
      "Complete observability stack with structured logging, error tracking, and web analytics.",
    tags: ["Cookbook", "Monitoring", "Logging"],
    icon: Activity,
    isCookbook: true,
    recipes: ["pino-logging-setup", "sentry-setup", "vercel-analytics-setup"],
    previewCode: `// Structured logging with Pino
logger.info("Request completed", { duration: 45 });

// Error tracking with Sentry
Sentry.captureException(error);

// Web analytics with Vercel
track("signup_completed", { plan: "pro" });`,
  } satisfies Cookbook,
  {
    slug: "resend-setup",
    title: "Resend Setup",
    description:
      "Configure Resend for transactional emails like password resets and email verification.",
    tags: ["Email"],
    icon: Mail,
    requires: ["config-schema-setup"],
    previewCode: `export async function sendEmail({ to, subject, react }) {
  const { data, error } = await resend.emails.send({
    from: resendConfig.server.fromEmail,
    to: Array.isArray(to) ? to : [to],
    subject,
    react,
  });
}`,
  },
  {
    slug: "bun-testing",
    title: "Testing with Bun",
    description:
      "Configure unit testing with Bun's built-in test runner. Fast, Jest-compatible syntax, no additional framework needed. Includes GitHub Actions CI workflow.",
    tags: ["Config", "Testing"],
    icon: FlaskConical,
    previewCode: `import { describe, it, expect } from "bun:test";

describe("myFunction", () => {
  it("returns expected value", () => {
    expect(myFunction()).toBe("expected");
  });
});`,
  },
  {
    slug: "better-auth-setup",
    title: "Better Auth Setup",
    description:
      "Add user authentication using Better Auth with Drizzle ORM and Neon Postgres. Base setup with email/password authentication.",
    tags: ["Auth", "Neon", "Drizzle"],
    icon: KeyRound,
    requires: ["config-schema-setup", "neon-drizzle-setup"],
    previewCode: `export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: {
    enabled: true,
  },
});`,
  },
  {
    slug: "better-auth-emails",
    title: "Better Auth Emails",
    description:
      "Add email verification, password reset, and account management emails to Better Auth using Resend.",
    tags: ["Auth", "Email"],
    icon: Mail,
    requires: ["better-auth-setup", "resend-setup"],
    previewCode: `emailAndPassword: {
  requireEmailVerification: true,
  async sendResetPassword({ user, url }) {
    void sendEmail({
      to: user.email,
      react: <ForgotPasswordEmail resetLink={url} />,
    });
  },
},`,
  },
  {
    slug: "better-auth-components",
    title: "Better Auth Components",
    description:
      "Add UI components and pages for authentication flows including sign in, sign up, forgot password, reset password, and email verification.",
    tags: ["Auth", "UI Components"],
    icon: Layers,
    requires: ["better-auth-setup", "shadcn-ui-setup"],
    previewCode: `export function SignIn() {
  const [email, setEmail] = useState("");
  await signIn.email({ email, password, rememberMe });
}

// Pages with server-side session checks
const session = await auth.api.getSession({
  headers: await headers(),
});`,
  },
  {
    slug: "better-auth-profile",
    title: "Better Auth Profile & Account",
    description:
      "Add a complete account settings page with profile editing, password changes, email updates, session management, and account deletion.",
    tags: ["Auth", "UI Components"],
    icon: UserCog,
    requires: ["better-auth-emails", "shadcn-ui-setup"],
    previewCode: `// Profile page with all account management
<ProfileHeader />     {/* Edit name & avatar */}
<ChangeEmail />       {/* Update email */}
<ChangePassword />    {/* Change password */}
<Sessions />          {/* Revoke other sessions */}
<DeleteAccount />     {/* Delete with confirmation */}`,
  },
  {
    slug: "better-auth-protected-routes",
    title: "Better Auth Protected Routes",
    description:
      "Add server-side route protection to enforce authentication on specific pages while keeping others public.",
    tags: ["Auth"],
    icon: ShieldCheck,
    requires: ["better-auth-setup"],
    previewCode: `// Protected page pattern
const session = await auth.api.getSession({
  headers: await headers(),
});

if (!session) {
  redirect("/sign-in");
}

// User is authenticated
return <Dashboard user={session.user} />;`,
  },
  {
    slug: "authentication",
    title: "Authentication",
    description:
      "Complete authentication system with Better Auth, email verification, password reset, protected routes, and account management.",
    tags: ["Cookbook", "Auth"],
    icon: KeyRound,
    isCookbook: true,
    recipes: [
      "resend-setup",
      "better-auth-setup",
      "better-auth-emails",
      "better-auth-components",
      "better-auth-profile",
      "better-auth-protected-routes",
    ],
    requires: ["neon-drizzle-setup", "shadcn-ui-setup"],
    previewCode: `// Protected route pattern
const session = await auth.api.getSession({
  headers: await headers(),
});
if (!session) redirect("/sign-in");

<ProfileHeader /> <ChangePassword />
<Sessions /> <DeleteAccount />`,
  } satisfies Cookbook,
  {
    slug: "feature-flags-setup",
    title: "Feature Flags with Flags SDK",
    description:
      "Implement feature flags using the Vercel Flags SDK with server-side evaluation, environment-based toggles, and Vercel Toolbar integration.",
    tags: ["Config", "Vercel"],
    icon: Flag,
    requires: ["config-schema-setup"],
    previewCode: `export const stripeFlag = flag({
  key: "stripe-enabled",
  decide() {
    return Boolean(process.env.STRIPE_SECRET_KEY);
  },
});`,
  },
  {
    slug: "nuqs-setup",
    title: "URL State with nuqs",
    description:
      "Sync React state to URL query parameters for shareable filters, search queries, and deep links to modal dialogs. Preserves UI state on browser back/forward navigation.",
    tags: ["Config", "UI Components"],
    icon: Link2,
    requires: ["nextjs-on-vercel"],
    previewCode: `const [search, setSearch] = useQueryState(
  "q",
  parseAsString.withDefault(""),
);
const [deleteId, setDeleteId] = useQueryState(
  "delete",
  parseAsString,
);

// Deep link: /chats?q=auth&delete=abc123`,
  },
  {
    slug: "ai-chat-persistence",
    title: "AI Chat Persistence with Neon",
    description:
      "Persist AI chat conversations to Neon Postgres with full support for AI SDK message parts including tools, reasoning, and streaming. Uses UUID v7 for chronologically-sortable IDs.",
    tags: ["AI", "Neon", "Drizzle", "Streaming"],
    icon: MessageSquare,
    requires: ["better-auth-setup"],
    previewCode: `export const chats = pgTable("chats", {
  id: uuid("id").primaryKey()
    .default(sql\`uuid_generate_v7()\`),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});`,
  },
  {
    slug: "chat-list",
    title: "Chat List & Management",
    description:
      "Build a chat list page with search, rename, and delete functionality. Uses nuqs for URL-synced filters and deep-linkable modal dialogs.",
    tags: ["AI", "UI Components"],
    icon: List,
    requires: ["nuqs-setup", "ai-chat-persistence"],
    previewCode: `const [deleteId, setDeleteId] = useQueryState("delete");
const [renameId, setRenameId] = useQueryState("rename");

// Deep links: /chats?delete=abc or /chats?rename=xyz
<AlertDialog open={!!deleteId} onOpenChange={...}>
<Dialog open={!!renameId} onOpenChange={...}>`,
  },
  {
    slug: "stripe-sync",
    title: "Stripe Subscriptions DB Sync",
    description:
      "Complete subscription system with Stripe, Vercel Flags for plan configuration, webhook handling for syncing subscription state to Postgres, usage tracking, and billing portal integration.",
    tags: ["Stripe", "Neon", "Drizzle"],
    icon: CreditCard,
    requires: [
      "neon-drizzle-setup",
      "feature-flags-setup",
      "pino-logging-setup",
    ],
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
      "Install and configure the Workflow Development Kit for resumable, durable AI agent workflows with step-level persistence, stream resumption, and agent orchestration.",
    tags: ["Workflow Dev Kit", "Config"],
    icon: Layers,
    requires: ["pino-logging-setup"],
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
    requires: ["ai-agent-workflow"],
    previewCode: `const { parts } = await researchAgent.run(history, {
  maxSteps: 10,
  writable: getWritable(),
});

// Tool loop continues until finishReason !== "tool-calls"`,
    registryDeps: ["durable-agent"],
  },
  {
    slug: "chat-naming",
    title: "Automatic Chat Naming",
    description:
      "Generate descriptive chat titles from the first message using a fast LLM. Runs as a background workflow step after the main response to avoid delaying the experience.",
    tags: ["AI", "Agents", "Workflow Dev Kit"],
    icon: MessageSquare,
    requires: ["workflow-setup", "ai-chat-persistence"],
    previewCode: `const { text } = await generateText({
  model: "google/gemini-2.5-flash",
  system: namingSystemPrompt,
  prompt: userMessageText,
});

await db.update(chats)
  .set({ title: text.trim() })
  .where(eq(chats.id, chatId));`,
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
    requires: ["ai-chat-persistence", "pino-logging-setup"],
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

/** Get the MCP resource URI for a recipe or cookbook */
export function getItemResourceUri(item: Recipe | Cookbook): string {
  const type = isCookbook(item) ? "cookbook" : "recipe";
  return `${type}://fullstackrecipes.com/${item.slug}`;
}

/** Get the prompt text for implementing a recipe or cookbook */
export function getItemPromptText(item: Recipe | Cookbook): string {
  const type = isCookbook(item) ? "cookbook" : "recipe";
  return `Follow the "${item.title}" ${type} from fullstackrecipes`;
}

/** Generate a Cursor deeplink for a prompt */
export function getCursorPromptDeeplink(promptText: string): string {
  const baseUrl = "cursor://anysphere.cursor-deeplink/prompt";
  const url = new URL(baseUrl);
  url.searchParams.set("text", promptText);
  return url.toString();
}

/**
 * Redirect mapping for old recipe slugs to new ones.
 * When a recipe is renamed or merged, add the old slug here.
 */
export const recipeRedirects: Record<string, string> = {
  "env-config": "env-management",
};

/** Get the redirect destination for an old slug, or undefined if no redirect exists */
export function getRedirectSlug(slug: string): string | undefined {
  return recipeRedirects[slug];
}

// Registry items from registry.json
const REGISTRY_ICONS: Record<string, typeof Database> = {
  "config-schema": Cog,
  "validate-env": FlaskConical,
  assert: Blocks,
  "use-resumable-chat": Package,
  "durable-agent": Cpu,
  logger: ScrollText,
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

/** Get registry items by their names (for recipe pages) */
export function getRegistryItemsByNames(
  names: string[],
): { name: string; title: string; description: string }[] {
  return names
    .map((name) => {
      const item = registry.items.find((i) => i.name === name);
      if (!item) return null;
      return {
        name: item.name,
        title: item.title,
        description: item.description,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}
