import { Database, MessageSquare, Bot, CreditCard } from "lucide-react";

export type Recipe = {
  slug: string;
  title: string;
  description: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  time: string;
  tags: string[];
  icon: typeof Database;
  content: string;
  tableOfContents: { id: string; title: string; level: number }[];
};

export const recipes: Recipe[] = [
  {
    slug: "neon-drizzle-setup",
    title: "Neon + Drizzle Setup",
    description:
      "Set up a PostgreSQL database with Neon and Drizzle ORM for type-safe database queries in your Next.js app.",
    difficulty: "Beginner",
    time: "15 min",
    tags: ["Database", "ORM", "Postgres"],
    icon: Database,
    content: `
## Drizzle <> PostgreSQL

This guide assumes familiarity with:
- Database connection basics with Drizzle
- node-postgres basics
- postgres.js basics

Drizzle has native support for PostgreSQL connections with the **node-postgres** and **postgres.js** drivers.

There are a few differences between the node-postgres and postgres.js drivers that we discovered while using both and integrating them with the Drizzle ORM. For example:

- With node-postgres, you can install \`pg-native\` to boost the speed of both node-postgres and Drizzle by approximately 10%.
- node-postgres supports providing type parsers on a per-query basis without globally patching things. For more details, see Types Docs.
- postgres.js uses prepared statements by default, which you may need to opt out of. This could be a potential issue in AWS environments, among others, so please keep that in mind.

---

## node-postgres

### Step 1 - Install packages

\`\`\`bash
npm i drizzle-orm pg
npm i -D drizzle-kit @types/pg
\`\`\`

### Step 2 - Initialize the driver and make a query

\`\`\`typescript
// Make sure to install the 'pg' package 
import { drizzle } from 'drizzle-orm/node-postgres';

const db = drizzle(process.env.DATABASE_URL);
 
const result = await db.execute('select 1');
\`\`\`

If you need to provide your existing driver:

\`\`\`typescript
// Make sure to install the 'pg' package 
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle({ client: pool });
 
const result = await db.execute('select 1');
\`\`\`

---

## postgres.js

### Step 1 - Install packages

\`\`\`bash
npm i drizzle-orm postgres
npm i -D drizzle-kit
\`\`\`

### Step 2 - Initialize the driver and make a query

\`\`\`typescript
import { drizzle } from 'drizzle-orm/postgres-js';

const db = drizzle(process.env.DATABASE_URL);

const result = await db.execute('select 1');
\`\`\`

If you need to provide your existing driver:

\`\`\`typescript
// Make sure to install the 'postgres' package
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const queryClient = postgres(process.env.DATABASE_URL);
const db = drizzle({ client: queryClient });

const result = await db.execute('select 1');
\`\`\`
`,
    tableOfContents: [
      { id: "drizzle--postgresql", title: "Drizzle <> PostgreSQL", level: 2 },
      { id: "node-postgres", title: "node-postgres", level: 2 },
      {
        id: "step-1---install-packages",
        title: "Step 1 - Install packages",
        level: 3,
      },
      {
        id: "step-2---initialize-the-driver-and-make-a-query",
        title: "Step 2 - Initialize the driver",
        level: 3,
      },
      { id: "postgresjs", title: "postgres.js", level: 2 },
      {
        id: "step-1---install-packages-1",
        title: "Step 1 - Install packages",
        level: 3,
      },
      {
        id: "step-2---initialize-the-driver-and-make-a-query-1",
        title: "Step 2 - Initialize the driver",
        level: 3,
      },
    ],
  },
  {
    slug: "ai-chat-persistence",
    title: "AI Chat Persistence",
    description:
      "Save and restore AI conversations with proper message history. Works with any AI provider using the Vercel AI SDK.",
    difficulty: "Intermediate",
    time: "30 min",
    tags: ["AI", "Database", "Streaming"],
    icon: MessageSquare,
    content: `
## Overview

Learn how to persist AI chat conversations to a database, allowing users to continue their conversations across sessions and devices.

This recipe uses the Vercel AI SDK with a PostgreSQL database to store chat messages.

---

## Prerequisites

Before starting, make sure you have:
- A Next.js app with the AI SDK installed
- A PostgreSQL database (we recommend Neon)
- Basic understanding of server actions

---

## Database Schema

### Step 1 - Create the conversations table

\`\`\`sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
\`\`\`

### Step 2 - Create the messages table

\`\`\`sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
\`\`\`

---

## Server Actions

### Step 3 - Create the persistence layer

\`\`\`typescript
// app/actions/chat.ts
"use server"

import { db } from "@/lib/db"

export async function saveMessage(
  conversationId: string,
  role: "user" | "assistant",
  content: string
) {
  await db.insert(messages).values({
    conversationId,
    role,
    content,
  })
}

export async function getConversation(conversationId: string) {
  return await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt))
}

export async function createConversation(userId: string, title?: string) {
  const [conversation] = await db
    .insert(conversations)
    .values({ userId, title })
    .returning()
  
  return conversation
}
\`\`\`

---

## Chat Component Integration

### Step 4 - Hook up persistence to useChat

\`\`\`typescript
// components/chat.tsx
"use client"

import { useChat } from "ai/react"
import { saveMessage } from "@/app/actions/chat"

export function Chat({ conversationId }: { conversationId: string }) {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    id: conversationId,
    onFinish: async (message) => {
      await saveMessage(conversationId, "assistant", message.content)
    },
  })

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await saveMessage(conversationId, "user", input)
    handleSubmit(e)
  }

  return (
    <div>
      {messages.map((m) => (
        <div key={m.id}>
          <strong>{m.role}:</strong> {m.content}
        </div>
      ))}
      <form onSubmit={onSubmit}>
        <input value={input} onChange={handleInputChange} />
        <button type="submit">Send</button>
      </form>
    </div>
  )
}
\`\`\`

---

## Loading Previous Messages

### Step 5 - Hydrate chat with history

\`\`\`typescript
// app/chat/[id]/page.tsx
import { getConversation } from "@/app/actions/chat"
import { Chat } from "@/components/chat"

export default async function ChatPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const messages = await getConversation(params.id)
  
  return (
    <Chat 
      conversationId={params.id} 
      initialMessages={messages} 
    />
  )
}
\`\`\`
`,
    tableOfContents: [
      { id: "overview", title: "Overview", level: 2 },
      { id: "prerequisites", title: "Prerequisites", level: 2 },
      { id: "database-schema", title: "Database Schema", level: 2 },
      {
        id: "step-1---create-the-conversations-table",
        title: "Step 1 - Conversations table",
        level: 3,
      },
      {
        id: "step-2---create-the-messages-table",
        title: "Step 2 - Messages table",
        level: 3,
      },
      { id: "server-actions", title: "Server Actions", level: 2 },
      {
        id: "step-3---create-the-persistence-layer",
        title: "Step 3 - Persistence layer",
        level: 3,
      },
      {
        id: "chat-component-integration",
        title: "Chat Component Integration",
        level: 2,
      },
      {
        id: "step-4---hook-up-persistence-to-usechat",
        title: "Step 4 - useChat integration",
        level: 3,
      },
      {
        id: "loading-previous-messages",
        title: "Loading Previous Messages",
        level: 2,
      },
      {
        id: "step-5---hydrate-chat-with-history",
        title: "Step 5 - Hydrate with history",
        level: 3,
      },
    ],
  },
  {
    slug: "ai-agent-workflow",
    title: "AI Agent Workflow",
    description:
      "Build multi-step AI agents with custom tool loops. Create autonomous workflows that reason and act on your behalf.",
    difficulty: "Advanced",
    time: "45 min",
    tags: ["AI", "Agents", "Tools"],
    icon: Bot,
    content: `
## Overview

Build a custom AI agent that can reason through complex tasks using tool calling and multi-step workflows. This pattern allows your AI to break down problems, use external tools, and iterate until it reaches a solution.

---

## Core Concepts

### What is an Agent Loop?

An agent loop is a pattern where the AI:
1. Receives a task
2. Decides what action to take
3. Executes the action (tool call)
4. Observes the result
5. Repeats until the task is complete

---

## Define Your Tools

### Step 1 - Create tool definitions

\`\`\`typescript
// lib/tools.ts
import { tool } from "ai"
import { z } from "zod"

export const searchTool = tool({
  description: "Search the web for information",
  parameters: z.object({
    query: z.string().describe("The search query"),
  }),
  execute: async ({ query }) => {
    // Implement your search logic
    const results = await fetch(\`/api/search?q=\${query}\`)
    return results.json()
  },
})

export const calculatorTool = tool({
  description: "Perform mathematical calculations",
  parameters: z.object({
    expression: z.string().describe("Math expression to evaluate"),
  }),
  execute: async ({ expression }) => {
    // Safe math evaluation
    return { result: eval(expression) }
  },
})

export const weatherTool = tool({
  description: "Get current weather for a location",
  parameters: z.object({
    location: z.string().describe("City name"),
  }),
  execute: async ({ location }) => {
    const response = await fetch(
      \`https://api.weather.com/v1/current?city=\${location}\`
    )
    return response.json()
  },
})
\`\`\`

---

## Agent Loop Implementation

### Step 2 - Create the agent loop

\`\`\`typescript
// lib/agent.ts
import { generateText } from "ai"
import { searchTool, calculatorTool, weatherTool } from "./tools"

const MAX_ITERATIONS = 10

export async function runAgent(task: string) {
  const tools = { search: searchTool, calculator: calculatorTool, weather: weatherTool }
  const messages: Message[] = [{ role: "user", content: task }]
  
  let iterations = 0
  
  while (iterations < MAX_ITERATIONS) {
    const result = await generateText({
      model: "anthropic/claude-sonnet-4-20250514",
      messages,
      tools,
      system: \`You are a helpful assistant that solves tasks step by step.
        Think through each step carefully before acting.
        When you have completed the task, respond with TASK_COMPLETE.\`,
    })

    // Add assistant response to history
    messages.push({ role: "assistant", content: result.text })

    // Check if task is complete
    if (result.text.includes("TASK_COMPLETE")) {
      return {
        success: true,
        result: result.text,
        iterations,
      }
    }

    // Process tool calls
    if (result.toolCalls.length > 0) {
      for (const toolCall of result.toolCalls) {
        const toolResult = await tools[toolCall.toolName].execute(
          toolCall.args
        )
        messages.push({
          role: "tool",
          content: JSON.stringify(toolResult),
          toolCallId: toolCall.toolCallId,
        })
      }
    }

    iterations++
  }

  return {
    success: false,
    result: "Max iterations reached",
    iterations,
  }
}
\`\`\`

---

## API Route

### Step 3 - Create the API endpoint

\`\`\`typescript
// app/api/agent/route.ts
import { runAgent } from "@/lib/agent"

export async function POST(request: Request) {
  const { task } = await request.json()
  
  try {
    const result = await runAgent(task)
    return Response.json(result)
  } catch (error) {
    return Response.json(
      { error: "Agent execution failed" },
      { status: 500 }
    )
  }
}
\`\`\`

---

## Streaming Agent Responses

### Step 4 - Add streaming support

\`\`\`typescript
// lib/agent-stream.ts
import { streamText } from "ai"

export async function* runAgentStream(task: string) {
  const tools = { search: searchTool, calculator: calculatorTool }
  const messages: Message[] = [{ role: "user", content: task }]
  
  let iterations = 0
  
  while (iterations < MAX_ITERATIONS) {
    const stream = await streamText({
      model: "anthropic/claude-sonnet-4-20250514",
      messages,
      tools,
    })

    for await (const chunk of stream) {
      yield {
        type: "text",
        content: chunk.text,
        iteration: iterations,
      }
    }

    const result = await stream.finalText
    
    if (result.includes("TASK_COMPLETE")) {
      yield { type: "complete", iterations }
      return
    }

    iterations++
  }
}
\`\`\`
`,
    tableOfContents: [
      { id: "overview", title: "Overview", level: 2 },
      { id: "core-concepts", title: "Core Concepts", level: 2 },
      {
        id: "what-is-an-agent-loop",
        title: "What is an Agent Loop?",
        level: 3,
      },
      { id: "define-your-tools", title: "Define Your Tools", level: 2 },
      {
        id: "step-1---create-tool-definitions",
        title: "Step 1 - Tool definitions",
        level: 3,
      },
      {
        id: "agent-loop-implementation",
        title: "Agent Loop Implementation",
        level: 2,
      },
      {
        id: "step-2---create-the-agent-loop",
        title: "Step 2 - Agent loop",
        level: 3,
      },
      { id: "api-route", title: "API Route", level: 2 },
      {
        id: "step-3---create-the-api-endpoint",
        title: "Step 3 - API endpoint",
        level: 3,
      },
      {
        id: "streaming-agent-responses",
        title: "Streaming Agent Responses",
        level: 2,
      },
      {
        id: "step-4---add-streaming-support",
        title: "Step 4 - Streaming support",
        level: 3,
      },
    ],
  },
  {
    slug: "stripe-sync",
    title: "Stripe Sync",
    description:
      "Sync Stripe products, prices, and subscriptions to your database. Handle webhooks and manage customer state reliably.",
    difficulty: "Intermediate",
    time: "40 min",
    tags: ["Payments", "Webhooks", "Database"],
    icon: CreditCard,
    content: `
## Overview

Keep your database in sync with Stripe using webhooks. This recipe covers syncing products, prices, customers, and subscriptions so you always have up-to-date payment data locally.

---

## Why Sync?

Syncing Stripe data to your database allows you to:
- Query payment data alongside your app data
- Reduce API calls to Stripe
- Build faster dashboards and reports
- Work offline during development

---

## Database Schema

### Step 1 - Create Stripe sync tables

\`\`\`sql
-- Products from Stripe
CREATE TABLE stripe_products (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Prices from Stripe
CREATE TABLE stripe_prices (
  id VARCHAR(255) PRIMARY KEY,
  product_id VARCHAR(255) REFERENCES stripe_products(id),
  currency VARCHAR(3) NOT NULL,
  unit_amount INTEGER,
  recurring_interval VARCHAR(50),
  active BOOLEAN DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Customer mapping
CREATE TABLE stripe_customers (
  id VARCHAR(255) PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  email VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Subscriptions
CREATE TABLE stripe_subscriptions (
  id VARCHAR(255) PRIMARY KEY,
  customer_id VARCHAR(255) REFERENCES stripe_customers(id),
  price_id VARCHAR(255) REFERENCES stripe_prices(id),
  status VARCHAR(50) NOT NULL,
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
\`\`\`

---

## Webhook Handler

### Step 2 - Create the webhook endpoint

\`\`\`typescript
// app/api/webhooks/stripe/route.ts
import { headers } from "next/headers"
import Stripe from "stripe"
import { db } from "@/lib/db"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: Request) {
  const body = await request.text()
  const signature = headers().get("stripe-signature")!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    return new Response("Webhook signature verification failed", { 
      status: 400 
    })
  }

  switch (event.type) {
    case "product.created":
    case "product.updated":
      await syncProduct(event.data.object as Stripe.Product)
      break
    case "price.created":
    case "price.updated":
      await syncPrice(event.data.object as Stripe.Price)
      break
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await syncSubscription(event.data.object as Stripe.Subscription)
      break
  }

  return new Response("OK", { status: 200 })
}
\`\`\`

---

## Sync Functions

### Step 3 - Implement sync logic

\`\`\`typescript
// lib/stripe-sync.ts
import { db } from "@/lib/db"
import type Stripe from "stripe"

export async function syncProduct(product: Stripe.Product) {
  await db
    .insert(stripeProducts)
    .values({
      id: product.id,
      name: product.name,
      description: product.description,
      active: product.active,
      metadata: product.metadata,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: stripeProducts.id,
      set: {
        name: product.name,
        description: product.description,
        active: product.active,
        metadata: product.metadata,
        updatedAt: new Date(),
      },
    })
}

export async function syncPrice(price: Stripe.Price) {
  await db
    .insert(stripePrices)
    .values({
      id: price.id,
      productId: price.product as string,
      currency: price.currency,
      unitAmount: price.unit_amount,
      recurringInterval: price.recurring?.interval,
      active: price.active,
      metadata: price.metadata,
    })
    .onConflictDoUpdate({
      target: stripePrices.id,
      set: {
        active: price.active,
        metadata: price.metadata,
      },
    })
}

export async function syncSubscription(subscription: Stripe.Subscription) {
  await db
    .insert(stripeSubscriptions)
    .values({
      id: subscription.id,
      customerId: subscription.customer as string,
      priceId: subscription.items.data[0].price.id,
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: stripeSubscriptions.id,
      set: {
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        updatedAt: new Date(),
      },
    })
}
\`\`\`

---

## Initial Sync Script

### Step 4 - Backfill existing data

\`\`\`typescript
// scripts/sync-stripe.ts
import Stripe from "stripe"
import { syncProduct, syncPrice } from "@/lib/stripe-sync"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

async function syncAll() {
  // Sync all products
  const products = await stripe.products.list({ limit: 100 })
  for (const product of products.data) {
    await syncProduct(product)
    console.log(\`Synced product: \${product.name}\`)
  }

  // Sync all prices
  const prices = await stripe.prices.list({ limit: 100 })
  for (const price of prices.data) {
    await syncPrice(price)
    console.log(\`Synced price: \${price.id}\`)
  }

  console.log("Stripe sync complete!")
}

syncAll()
\`\`\`
`,
    tableOfContents: [
      { id: "overview", title: "Overview", level: 2 },
      { id: "why-sync", title: "Why Sync?", level: 2 },
      { id: "database-schema", title: "Database Schema", level: 2 },
      {
        id: "step-1---create-stripe-sync-tables",
        title: "Step 1 - Sync tables",
        level: 3,
      },
      { id: "webhook-handler", title: "Webhook Handler", level: 2 },
      {
        id: "step-2---create-the-webhook-endpoint",
        title: "Step 2 - Webhook endpoint",
        level: 3,
      },
      { id: "sync-functions", title: "Sync Functions", level: 2 },
      {
        id: "step-3---implement-sync-logic",
        title: "Step 3 - Sync logic",
        level: 3,
      },
      { id: "initial-sync-script", title: "Initial Sync Script", level: 2 },
      {
        id: "step-4---backfill-existing-data",
        title: "Step 4 - Backfill data",
        level: 3,
      },
    ],
  },
];

export function getRecipeBySlug(slug: string): Recipe | undefined {
  return recipes.find((r) => r.slug === slug);
}

export function getAllRecipes(): Recipe[] {
  return recipes;
}
