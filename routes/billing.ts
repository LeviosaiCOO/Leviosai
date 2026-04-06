import { Router, Request, Response } from "express";
import { requireAuth } from "./auth.js";
import { storage } from "../lib/storage.js";
import {
  isStripeConfigured,
  createStripeCustomer,
  createCheckoutSession,
  createPortalSession,
  getSubscriptionStatus,
  handleWebhookEvent,
  PLANS,
} from "../lib/stripe.js";

const router = Router();

// Get current billing status
router.get("/api/billing", requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.organizationId) return res.status(400).json({ error: "No organization" });
    const org = await storage.getOrganization(req.organizationId);
    if (!org) return res.status(404).json({ error: "Organization not found" });

    let subscription = null;
    if (org.stripeSubscriptionId) {
      subscription = await getSubscriptionStatus(org.stripeSubscriptionId);
    }

    const planKey = (org.plan || "free") as keyof typeof PLANS;
    res.json({
      plan: planKey,
      planDetails: PLANS[planKey] || PLANS.free,
      subscription,
      stripeConfigured: isStripeConfigured(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get available plans
router.get("/api/billing/plans", requireAuth, async (_req: Request, res: Response) => {
  const plans = Object.entries(PLANS).map(([key, plan]) => ({
    key,
    ...plan,
    priceId: plan.priceId ? "configured" : null, // don't expose actual price IDs
  }));
  res.json(plans);
});

// Create checkout session to upgrade
router.post("/api/billing/checkout", requireAuth, async (req: Request, res: Response) => {
  try {
    if (!isStripeConfigured()) return res.status(503).json({ error: "Stripe not configured" });
    if (!req.organizationId) return res.status(400).json({ error: "No organization" });

    const { plan } = req.body;
    if (!plan || !PLANS[plan as keyof typeof PLANS]) {
      return res.status(400).json({ error: "Invalid plan" });
    }

    const planConfig = PLANS[plan as keyof typeof PLANS];
    if (!planConfig.priceId) {
      return res.status(400).json({ error: "Plan not available for purchase" });
    }

    const org = await storage.getOrganization(req.organizationId);
    if (!org) return res.status(404).json({ error: "Organization not found" });

    // Create Stripe customer if needed
    let customerId = org.stripeCustomerId;
    if (!customerId) {
      const customer = await createStripeCustomer(org.id, req.userEmail!, org.name);
      if (!customer) return res.status(500).json({ error: "Failed to create Stripe customer" });
      customerId = customer.id;
    }

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const session = await createCheckoutSession(
      org.id,
      customerId,
      planConfig.priceId,
      `${baseUrl}/billing?success=true`,
      `${baseUrl}/billing?canceled=true`
    );

    res.json({ url: session.url });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create portal session to manage subscription
router.post("/api/billing/portal", requireAuth, async (req: Request, res: Response) => {
  try {
    if (!isStripeConfigured()) return res.status(503).json({ error: "Stripe not configured" });
    if (!req.organizationId) return res.status(400).json({ error: "No organization" });

    const org = await storage.getOrganization(req.organizationId);
    if (!org?.stripeCustomerId) {
      return res.status(400).json({ error: "No billing account found. Subscribe to a plan first." });
    }

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const session = await createPortalSession(org.stripeCustomerId, `${baseUrl}/billing`);

    res.json({ url: session.url });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Stripe webhook (no auth — Stripe calls this directly)
router.post("/api/billing/webhook", async (req: Request, res: Response) => {
  try {
    const signature = req.headers["stripe-signature"] as string;
    if (!signature) return res.status(400).json({ error: "Missing stripe-signature header" });

    const result = await handleWebhookEvent(req.body, signature);
    res.json(result);
  } catch (error: any) {
    console.error("Stripe webhook error:", error.message);
    res.status(400).json({ error: error.message });
  }
});

export default router;
