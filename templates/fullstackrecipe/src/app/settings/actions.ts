"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth/server";
import {
  redirectToCheckout,
  redirectToBillingPortal,
} from "@/lib/stripe/checkout";

export async function createCheckoutSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized");
  }

  if (!session.user.emailVerified || !session.user.email) {
    throw new Error("Email not verified");
  }

  await redirectToCheckout({
    userId: session.user.id,
    email: session.user.email,
    name: session.user.name,
  });
}

export async function createBillingPortalSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized");
  }

  await redirectToBillingPortal({
    userId: session.user.id,
  });
}
