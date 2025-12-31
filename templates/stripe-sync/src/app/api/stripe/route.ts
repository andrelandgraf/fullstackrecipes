import { after, NextResponse } from "next/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import {
  verifyWebhookSignature,
  processStripeEvent,
  syncStripeData,
} from "@/lib/stripe/webhook";
import { getStripeCustomer } from "@/lib/stripe/queries";

// GET: Post-checkout redirect handler
export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const customer = await getStripeCustomer(session.user.id);

  if (customer) {
    await syncStripeData(customer.stripeCustomerId);
  }

  redirect("/settings");
}

// POST: Webhook handler
export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("Stripe-Signature");

  if (!signature) {
    return new NextResponse("No signature", { status: 400 });
  }

  const result = verifyWebhookSignature(body, signature);

  if (!result.success) {
    console.error("Webhook signature verification failed:", result.error);
    return new NextResponse("Invalid signature", { status: 400 });
  }

  // Process webhook in background (after response)
  after(async () => {
    await processStripeEvent(result.event);
  });

  return new NextResponse(null, { status: 200 });
}
