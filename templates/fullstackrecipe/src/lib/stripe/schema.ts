import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export const SUBSCRIPTION_STATUS = [
  "active",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "past_due",
  "paused",
  "trialing",
  "unpaid",
] as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUS)[number];

export const stripeCustomers = pgTable("stripe_customers", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().unique(),
  stripeCustomerId: text("stripe_customer_id").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().unique(),
  stripeSubscriptionId: text("stripe_subscription_id").notNull().unique(),
  stripePriceId: text("stripe_price_id").notNull(),
  status: text("status", { enum: SUBSCRIPTION_STATUS }).notNull(),
  currentPeriodStart: timestamp("current_period_start", {
    withTimezone: true,
  }).notNull(),
  currentPeriodEnd: timestamp("current_period_end", {
    withTimezone: true,
  }).notNull(),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const userMetrics = pgTable("user_metrics", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  month: text("month").notNull(), // Format: "YYYY-MM"
  chatRequests: integer("chat_requests").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type StripeCustomer = InferSelectModel<typeof stripeCustomers>;
export type NewStripeCustomer = InferInsertModel<typeof stripeCustomers>;
export type Subscription = InferSelectModel<typeof subscriptions>;
export type NewSubscription = InferInsertModel<typeof subscriptions>;
export type UserMetrics = InferSelectModel<typeof userMetrics>;
export type NewUserMetrics = InferInsertModel<typeof userMetrics>;
