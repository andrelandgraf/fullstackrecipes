import { db } from "@/lib/db/client";
import { userRecipes, recipeBookmarks } from "./schema";
import { eq, and, desc, or, ilike, isNull, isNotNull } from "drizzle-orm";
import type { UserRecipe, NewUserRecipe, RecipeBookmark } from "./schema";
import { getItemBySlug, type Recipe, type Cookbook } from "./data";

// ============================================================================
// User Recipes CRUD
// ============================================================================

export async function createUserRecipe(
  data: Omit<NewUserRecipe, "id" | "createdAt" | "updatedAt">,
): Promise<UserRecipe> {
  const [recipe] = await db.insert(userRecipes).values(data).returning();
  return recipe;
}

export async function updateUserRecipe(
  id: string,
  userId: string,
  data: Partial<
    Pick<
      NewUserRecipe,
      "title" | "description" | "content" | "tags" | "isPublic" | "slug"
    >
  >,
): Promise<UserRecipe | null> {
  const [updated] = await db
    .update(userRecipes)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(userRecipes.id, id), eq(userRecipes.userId, userId)))
    .returning();
  return updated ?? null;
}

export async function deleteUserRecipe(
  id: string,
  userId: string,
): Promise<boolean> {
  const result = await db
    .delete(userRecipes)
    .where(and(eq(userRecipes.id, id), eq(userRecipes.userId, userId)))
    .returning({ id: userRecipes.id });
  return result.length > 0;
}

export async function getUserRecipeById(
  id: string,
): Promise<UserRecipe | null> {
  const recipe = await db.query.userRecipes.findFirst({
    where: eq(userRecipes.id, id),
  });
  return recipe ?? null;
}

export async function getUserRecipeBySlug(
  userId: string,
  slug: string,
): Promise<UserRecipe | null> {
  const recipe = await db.query.userRecipes.findFirst({
    where: and(eq(userRecipes.userId, userId), eq(userRecipes.slug, slug)),
  });
  return recipe ?? null;
}

export async function getUserRecipes(userId: string): Promise<UserRecipe[]> {
  return db.query.userRecipes.findMany({
    where: eq(userRecipes.userId, userId),
    orderBy: [desc(userRecipes.updatedAt)],
  });
}

export async function getPublicRecipes(options?: {
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<(UserRecipe & { userName: string })[]> {
  const { search, limit = 50, offset = 0 } = options ?? {};

  const conditions = [eq(userRecipes.isPublic, true)];

  if (search) {
    conditions.push(
      or(
        ilike(userRecipes.title, `%${search}%`),
        ilike(userRecipes.description, `%${search}%`),
      )!,
    );
  }

  const recipes = await db.query.userRecipes.findMany({
    where: and(...conditions),
    orderBy: [desc(userRecipes.createdAt)],
    limit,
    offset,
    with: {
      user: {
        columns: {
          name: true,
        },
      },
    },
  });

  return recipes.map((r) => ({
    ...r,
    userName: r.user.name,
  }));
}

// ============================================================================
// Bookmarks (Library)
// ============================================================================

export async function addBookmark(
  userId: string,
  target: { builtInSlug: string } | { userRecipeId: string },
): Promise<RecipeBookmark> {
  const [bookmark] = await db
    .insert(recipeBookmarks)
    .values({
      userId,
      ...target,
    })
    .onConflictDoNothing()
    .returning();

  // If conflict, return the existing bookmark
  if (!bookmark) {
    const existing = await db.query.recipeBookmarks.findFirst({
      where: and(
        eq(recipeBookmarks.userId, userId),
        "builtInSlug" in target
          ? eq(recipeBookmarks.builtInSlug, target.builtInSlug)
          : eq(recipeBookmarks.userRecipeId, target.userRecipeId),
      ),
    });
    return existing!;
  }

  return bookmark;
}

export async function removeBookmark(
  userId: string,
  target: { builtInSlug: string } | { userRecipeId: string },
): Promise<boolean> {
  const result = await db
    .delete(recipeBookmarks)
    .where(
      and(
        eq(recipeBookmarks.userId, userId),
        "builtInSlug" in target
          ? eq(recipeBookmarks.builtInSlug, target.builtInSlug)
          : eq(recipeBookmarks.userRecipeId, target.userRecipeId),
      ),
    )
    .returning({ id: recipeBookmarks.id });
  return result.length > 0;
}

export async function isBookmarked(
  userId: string,
  target: { builtInSlug: string } | { userRecipeId: string },
): Promise<boolean> {
  const bookmark = await db.query.recipeBookmarks.findFirst({
    where: and(
      eq(recipeBookmarks.userId, userId),
      "builtInSlug" in target
        ? eq(recipeBookmarks.builtInSlug, target.builtInSlug)
        : eq(recipeBookmarks.userRecipeId, target.userRecipeId),
    ),
  });
  return !!bookmark;
}

export type LibraryItem =
  | { type: "built-in"; item: Recipe | Cookbook; bookmarkedAt: Date }
  | {
      type: "user-recipe";
      item: UserRecipe & { userName: string };
      bookmarkedAt: Date;
    };

export async function getUserLibrary(userId: string): Promise<LibraryItem[]> {
  const bookmarks = await db.query.recipeBookmarks.findMany({
    where: eq(recipeBookmarks.userId, userId),
    orderBy: [desc(recipeBookmarks.createdAt)],
    with: {
      userRecipe: {
        with: {
          user: {
            columns: {
              name: true,
            },
          },
        },
      },
    },
  });

  const libraryItems: LibraryItem[] = [];

  for (const bookmark of bookmarks) {
    if (bookmark.builtInSlug) {
      const item = getItemBySlug(bookmark.builtInSlug);
      if (item) {
        libraryItems.push({
          type: "built-in",
          item,
          bookmarkedAt: bookmark.createdAt,
        });
      }
    } else if (bookmark.userRecipe) {
      libraryItems.push({
        type: "user-recipe",
        item: {
          ...bookmark.userRecipe,
          userName: bookmark.userRecipe.user.name,
        },
        bookmarkedAt: bookmark.createdAt,
      });
    }
  }

  return libraryItems;
}

export async function getUserBookmarkSlugs(
  userId: string,
): Promise<Set<string>> {
  const bookmarks = await db.query.recipeBookmarks.findMany({
    where: and(
      eq(recipeBookmarks.userId, userId),
      isNotNull(recipeBookmarks.builtInSlug),
    ),
    columns: {
      builtInSlug: true,
    },
  });

  return new Set(
    bookmarks.map((b) => b.builtInSlug).filter((s): s is string => s !== null),
  );
}

export async function getUserBookmarkUserRecipeIds(
  userId: string,
): Promise<Set<string>> {
  const bookmarks = await db.query.recipeBookmarks.findMany({
    where: and(
      eq(recipeBookmarks.userId, userId),
      isNotNull(recipeBookmarks.userRecipeId),
    ),
    columns: {
      userRecipeId: true,
    },
  });

  return new Set(
    bookmarks.map((b) => b.userRecipeId).filter((s): s is string => s !== null),
  );
}

// ============================================================================
// Slug helpers
// ============================================================================

/**
 * Generate a unique slug for a user recipe.
 * Appends a number suffix if the base slug already exists.
 */
export async function generateUniqueSlug(
  userId: string,
  title: string,
): Promise<string> {
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);

  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await getUserRecipeBySlug(userId, slug);
    if (!existing) {
      return slug;
    }
    counter++;
    slug = `${baseSlug}-${counter}`;
  }
}
