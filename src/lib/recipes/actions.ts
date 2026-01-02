"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import {
  createUserRecipe,
  updateUserRecipe,
  deleteUserRecipe,
  addBookmark,
  removeBookmark,
  generateUniqueSlug,
  getUserRecipeById,
} from "./queries";

// ============================================================================
// Recipe Actions
// ============================================================================

export async function createRecipeAction(formData: FormData) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return { error: "Unauthorized" };
  }

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const content = formData.get("content") as string;
  const tagsRaw = formData.get("tags") as string;
  const isPublic = formData.get("isPublic") === "true";

  if (!title?.trim()) {
    return { error: "Title is required" };
  }

  if (!content?.trim()) {
    return { error: "Content is required" };
  }

  const tags = tagsRaw
    ? tagsRaw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  const slug = await generateUniqueSlug(session.user.id, title);

  const recipe = await createUserRecipe({
    userId: session.user.id,
    slug,
    title: title.trim(),
    description: description?.trim() || "",
    content: content.trim(),
    tags,
    isPublic,
  });

  revalidatePath("/dashboard/recipes");
  revalidatePath("/community");

  return { success: true, recipe };
}

export async function updateRecipeAction(formData: FormData) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return { error: "Unauthorized" };
  }

  const id = formData.get("id") as string;
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const content = formData.get("content") as string;
  const tagsRaw = formData.get("tags") as string;
  const isPublic = formData.get("isPublic") === "true";

  if (!id) {
    return { error: "Recipe ID is required" };
  }

  if (!title?.trim()) {
    return { error: "Title is required" };
  }

  const tags = tagsRaw
    ? tagsRaw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  // Check if title changed and generate new slug if needed
  const existing = await getUserRecipeById(id);
  if (!existing || existing.userId !== session.user.id) {
    return { error: "Recipe not found" };
  }

  let slug = existing.slug;
  if (existing.title !== title.trim()) {
    slug = await generateUniqueSlug(session.user.id, title);
  }

  const recipe = await updateUserRecipe(id, session.user.id, {
    slug,
    title: title.trim(),
    description: description?.trim() || "",
    content: content.trim(),
    tags,
    isPublic,
  });

  if (!recipe) {
    return { error: "Recipe not found" };
  }

  revalidatePath("/dashboard/recipes");
  revalidatePath("/community");
  revalidatePath(`/community/${recipe.id}`);

  return { success: true, recipe };
}

export async function deleteRecipeAction(id: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return { error: "Unauthorized" };
  }

  const success = await deleteUserRecipe(id, session.user.id);

  if (!success) {
    return { error: "Recipe not found" };
  }

  revalidatePath("/dashboard/recipes");
  revalidatePath("/community");

  return { success: true };
}

// ============================================================================
// Bookmark Actions
// ============================================================================

export async function addBookmarkAction(
  target: { builtInSlug: string } | { userRecipeId: string },
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return { error: "Unauthorized" };
  }

  await addBookmark(session.user.id, target);

  revalidatePath("/library");
  revalidatePath("/recipes");
  revalidatePath("/community");

  return { success: true };
}

export async function removeBookmarkAction(
  target: { builtInSlug: string } | { userRecipeId: string },
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return { error: "Unauthorized" };
  }

  await removeBookmark(session.user.id, target);

  revalidatePath("/library");
  revalidatePath("/recipes");
  revalidatePath("/community");

  return { success: true };
}

export async function toggleBookmarkAction(
  target: { builtInSlug: string } | { userRecipeId: string },
  isCurrentlyBookmarked: boolean,
) {
  if (isCurrentlyBookmarked) {
    return removeBookmarkAction(target);
  } else {
    return addBookmarkAction(target);
  }
}
