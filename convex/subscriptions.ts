import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";
import { applyDowngradeToFree, applyReUpgradeToPro } from "./entitlements";
import { tryOrgContext } from "./lib/authz";

// Internal only — not reachable from the client. Exists so entitlements can
// be exercised in dev/tests without a real Stripe checkout: run it from the
// Convex dashboard or `npx convex run subscriptions:setPlanForTesting`.
// Production plan changes go through convex/stripeWebhook.ts instead.
export const setPlanForTesting = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    plan: v.union(v.literal("free"), v.literal("pro")),
  },
  handler: async (ctx, { organizationId, plan }) => {
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { plan, status: "active" });
    } else {
      await ctx.db.insert("subscriptions", { organizationId, plan, status: "active" });
    }

    if (plan === "free") {
      await applyDowngradeToFree(ctx, organizationId);
    } else {
      await applyReUpgradeToPro(ctx, organizationId);
    }
  },
});

// Used by convex/stripe.ts's createPortalSession action (actions can't
// touch ctx.db directly).
export const getStripeCustomerId = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
      .unique();
    return subscription?.stripeCustomerId ?? null;
  },
});

// Powers the billing settings page: current plan + renewal date, without
// exposing Stripe ids to the client.
export const getBillingInfo = query({
  args: {},
  handler: async (ctx) => {
    const orgContext = await tryOrgContext(ctx);
    if (!orgContext) return null;
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_org", (q) => q.eq("organizationId", orgContext.org._id))
      .unique();
    const isActivePro = subscription?.plan === "pro" && subscription.status === "active";
    return {
      plan: isActivePro ? ("pro" as const) : ("free" as const),
      status: subscription?.status ?? null,
      currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
      hasStripeCustomer: !!subscription?.stripeCustomerId,
    };
  },
});
