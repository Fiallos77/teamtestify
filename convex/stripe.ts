"use node";

import Stripe from "stripe";
import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

// Stripe Tax requires tax registrations to be configured in the Stripe
// Dashboard first — off by default so Checkout doesn't start collecting
// tax before that's set up. Flip once registrations are in place.
export const STRIPE_AUTOMATIC_TAX_ENABLED = false;

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function getStripeClient(): Stripe {
  return new Stripe(requiredEnv("STRIPE_SECRET_KEY"));
}

// returnUrl is client-supplied and Stripe doesn't restrict its domain — it
// redirects the browser there verbatim once checkout/the billing portal
// completes. Without this check a caller could pass an arbitrary origin and
// ride a legitimate Stripe flow straight into an open redirect (e.g. to a
// phishing page). Pure/exported so it's directly unit-testable without
// mocking the Stripe SDK.
export function assertSameOrigin(returnUrl: string): void {
  let parsed: URL;
  try {
    parsed = new URL(returnUrl);
  } catch {
    throw new Error("Invalid return URL");
  }
  const allowedOrigin = new URL(requiredEnv("APP_URL")).origin;
  if (parsed.origin !== allowedOrigin) {
    throw new Error("returnUrl must match the app's own origin");
  }
}

// Test-mode only (per teamtestify-v2-spec.md Phase 2 slice). Only the
// organization owner can start a checkout — any member could otherwise
// upgrade billing for an org they don't own.
export const createCheckoutSession = action({
  args: {
    interval: v.union(v.literal("monthly"), v.literal("yearly")),
    // The billing settings page URL to return to — success/cancel are
    // derived from it with a query param, so no app-origin env var is
    // needed here.
    returnUrl: v.string(),
  },
  handler: async (ctx, { interval, returnUrl }): Promise<{ url: string }> => {
    assertSameOrigin(returnUrl);
    const { organizationId } = await ctx.runQuery(
      internal.organizations.requireOwnerContext,
      {}
    );
    const priceId = requiredEnv(
      interval === "monthly" ? "STRIPE_PRO_MONTHLY_PRICE_ID" : "STRIPE_PRO_YEARLY_PRICE_ID"
    );

    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      // Both set, redundantly, so the webhook can recover organizationId
      // from either field regardless of which one a given integration
      // point reads.
      client_reference_id: organizationId,
      metadata: { organizationId },
      success_url: `${returnUrl}?checkout=success`,
      cancel_url: `${returnUrl}?checkout=cancel`,
      ...(STRIPE_AUTOMATIC_TAX_ENABLED ? { automatic_tax: { enabled: true } } : {}),
    });

    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    return { url: session.url };
  },
});

export const createPortalSession = action({
  args: { returnUrl: v.string() },
  handler: async (ctx, { returnUrl }): Promise<{ url: string }> => {
    assertSameOrigin(returnUrl);
    const { organizationId } = await ctx.runQuery(
      internal.organizations.requireOwnerContext,
      {}
    );
    const stripeCustomerId: string | null = await ctx.runQuery(
      internal.subscriptions.getStripeCustomerId,
      { organizationId }
    );
    if (!stripeCustomerId) {
      throw new Error("No billing account found for this organization yet");
    }

    const stripe = getStripeClient();
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    });
    return { url: session.url };
  },
});
