import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "@/lib/auth/schema";

/**
 * User-created recipes.
 * Users can create their own recipes which can be public or private.
 */
export const userRecipes = pgTable(
  "user_recipes",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuid_generate_v7()`),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    content: text("content").notNull(),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    isPublic: boolean("is_public").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("user_recipes_userId_idx").on(table.userId),
    index("user_recipes_isPublic_idx").on(table.isPublic),
    uniqueIndex("user_recipes_userId_slug_idx").on(table.userId, table.slug),
  ],
);

/**
 * Recipe bookmarks (library).
 * Users can bookmark both built-in recipes and community recipes.
 * - builtInSlug: for built-in recipes from data.tsx
 * - userRecipeId: for community/user-created recipes
 */
export const recipeBookmarks = pgTable(
  "recipe_bookmarks",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuid_generate_v7()`),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // For built-in recipes (from data.tsx)
    builtInSlug: text("built_in_slug"),
    // For user-created recipes
    userRecipeId: uuid("user_recipe_id").references(() => userRecipes.id, {
      onDelete: "cascade",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("recipe_bookmarks_userId_idx").on(table.userId),
    // Unique constraint: user can only bookmark each recipe once
    uniqueIndex("recipe_bookmarks_userId_builtIn_idx").on(
      table.userId,
      table.builtInSlug,
    ),
    uniqueIndex("recipe_bookmarks_userId_userRecipe_idx").on(
      table.userId,
      table.userRecipeId,
    ),
  ],
);

// Relations
export const userRecipesRelations = relations(userRecipes, ({ one, many }) => ({
  user: one(users, {
    fields: [userRecipes.userId],
    references: [users.id],
  }),
  bookmarks: many(recipeBookmarks),
}));

export const recipeBookmarksRelations = relations(
  recipeBookmarks,
  ({ one }) => ({
    user: one(users, {
      fields: [recipeBookmarks.userId],
      references: [users.id],
    }),
    userRecipe: one(userRecipes, {
      fields: [recipeBookmarks.userRecipeId],
      references: [userRecipes.id],
    }),
  }),
);

// Type exports
export type UserRecipe = typeof userRecipes.$inferSelect;
export type NewUserRecipe = typeof userRecipes.$inferInsert;
export type RecipeBookmark = typeof recipeBookmarks.$inferSelect;
export type NewRecipeBookmark = typeof recipeBookmarks.$inferInsert;

