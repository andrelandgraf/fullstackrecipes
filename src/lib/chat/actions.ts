"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import {
  deleteChat as deleteChatQuery,
  renameChat as renameChatQuery,
} from "./queries";
import { v7 as uuidv7 } from "uuid";

export async function deleteChatAction(chatId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return { error: "Unauthorized" };
  }

  const success = await deleteChatQuery(chatId, session.user.id);

  if (!success) {
    return { error: "Chat not found" };
  }

  revalidatePath("/chats");
  return { success: true };
}

export async function createNewChat() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const chatId = uuidv7();
  redirect(`/chats/${chatId}`);
}

export async function renameChatAction(chatId: string, newTitle: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return { error: "Unauthorized" };
  }

  const trimmedTitle = newTitle.trim();
  if (!trimmedTitle) {
    return { error: "Title cannot be empty" };
  }

  const success = await renameChatQuery(chatId, session.user.id, trimmedTitle);

  if (!success) {
    return { error: "Chat not found" };
  }

  revalidatePath("/chats");
  return { success: true, title: trimmedTitle };
}
