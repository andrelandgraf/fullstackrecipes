import { stripeConfig } from "./config";
import { getSubscription } from "./queries";

export type Plan = {
  id: "FREE" | "PRO";
  priceId: string | undefined;
  chatLimit: number;
};

const plans: Plan[] = [
  {
    id: "FREE",
    priceId: undefined,
    chatLimit: 10,
  },
  {
    id: "PRO",
    priceId: stripeConfig.server.proPriceId,
    chatLimit: 1000,
  },
];

export function getPlans(): Plan[] {
  return plans;
}

export function getFreePlan(): Plan {
  return plans.find((plan) => plan.priceId === undefined) ?? plans[0];
}

export function getProPlan(): Plan {
  return plans.find((plan) => plan.id === "PRO") ?? plans[1];
}

export async function getUserPlan(userId: string): Promise<Plan> {
  const freePlan = getFreePlan();
  const subscription = await getSubscription(userId);

  if (!subscription || subscription.status !== "active") {
    return freePlan;
  }

  const plan = plans.find((p) => p.priceId === subscription.stripePriceId);
  return plan ?? freePlan;
}
