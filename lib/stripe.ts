import Stripe from "stripe";
import { db } from "./db.js";
import { organizations } from "./schema.js";
import { eq } from "drizzle-orm";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export function isStripeConfigured() {
  return !!stripe;
}

// Plan definitions — update these price IDs after creating them in Stripe dashboard
export const PLANS = {
  free: {
    name: "Free",
    leadsLimit: 25,
    messagesPerMonth: 50,
    aiScoresPerMonth: 10,
    priceId: null as string | null,
  },
  pro: {
    name: "Pro",
    leadsLimit: 500,
    messagesPerMonth: 1000,
    aiScoresPerMonth: 200,
    priceId: process.env.STRIPE_PRO_PRICE_ID || null,
  },
  enterprise: {
    name: "Enterprise",
    leadsLimit: -1, // unlimited
    messagesPerMonth: -1,
    aiScoresPerMonth: -1,
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || null,
  },
} as const;

export type PlanKey = keyof typeof PLANS;

// Create a Stripe customer for an organization
export async function createStripeCustomer(orgId: number, email: string, orgName: string) {
  if (!stripe) return null;

  const customer = await stripe.customers.create({
    email,
    name: orgName,
    metadata: { organizationId: String(orgId) },
  });

  await db
    .update(organizations)
    .set({ stripeCustomerId: customer.id })
    .where(eq(organizations.id, orgId));

  return customer;
}

// Create a checkout session for upgrading
export async function createCheckoutSession(
  orgId: number,
  stripeCustomerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
) {
  if (!stripe) throw new Error("Stripe not configured");

  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { organizationId: String(orgId) },
  });

  return session;
}

// Create a billing portal session (manage subscription)
export async function createPortalSession(stripeCustomerId: string, returnUrl: string) {
  if (!stripe) throw new Error("Stripe not configured");

  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: returnUrl,
  });

  return session;
}

// Handle Stripe webhook events
export async function handleWebhookEvent(payload: Buffer, signature: string) {
  if (!stripe) throw new Error("Stripe not configured");

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET not set");

  const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const orgId = parseInt(session.metadata?.organizationId || "0");
      if (orgId && session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        const priceId = subscription.items.data[0]?.price.id;
        const plan = Object.entries(PLANS).find(([, p]) => p.priceId === priceId)?.[0] || "pro";

        await db
          .update(organizations)
          .set({
            stripeSubscriptionId: subscription.id,
            stripePriceId: priceId,
            plan,
          })
          .where(eq(organizations.id, orgId));
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      const priceId = subscription.items.data[0]?.price.id;
      const plan = Object.entries(PLANS).find(([, p]) => p.priceId === priceId)?.[0] || "pro";

      await db
        .update(organizations)
        .set({
          stripeSubscriptionId: subscription.id,
          stripePriceId: priceId,
          plan,
        })
        .where(eq(organizations.stripeCustomerId, customerId));
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      await db
        .update(organizations)
        .set({
          stripeSubscriptionId: null,
          stripePriceId: null,
          plan: "free",
        })
        .where(eq(organizations.stripeCustomerId, customerId));
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      console.warn(`⚠️  Payment failed for customer ${invoice.customer}`);
      break;
    }
  }

  return { received: true, type: event.type };
}

// Get subscription status for an org
export async function getSubscriptionStatus(stripeSubscriptionId: string) {
  if (!stripe) return null;
  const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  return {
    status: subscription.status,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  };
}
