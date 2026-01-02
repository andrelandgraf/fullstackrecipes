import { headers } from "next/headers";
import { auth } from "@/lib/auth/server";
import { getUserBookmarkSlugs } from "@/lib/recipes/queries";
import { RecipeGrid } from "./grid";

export async function RecipeGridWrapper() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const bookmarkedSlugs = session
    ? await getUserBookmarkSlugs(session.user.id)
    : new Set<string>();

  return (
    <RecipeGrid
      bookmarkedSlugs={bookmarkedSlugs}
      isAuthenticated={!!session}
    />
  );
}

