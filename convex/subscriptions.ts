import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  query,
  type MutationCtx,
} from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { applyDowngradeToFree, applyReUpgradeToPro } from "./entitlements";
import { tryOrgContext } from "./lib/authz";
import { mapStripeSubscriptionStatus } from "./lib/stripeStatus";

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

// Returns true if this eventId was already recorded (caller should skip).
async function recordEventOnce(
  ctx: MutationCtx,
  eventId: string,
  eventType: string
): Promise<boolean> {
  const existing = await ctx.db
    .query("stripeWebhookEvents")
    .withIndex("by_event_id", (q) => q.eq("eventId", eventId))
    .unique();
  if (existing) return true;
  await ctx.db.insert("stripeWebhookEvents", { eventId, eventType, processedAt: Date.now() });
  return false;
}

async function findSubscriptionByStripeIds(
  ctx: MutationCtx,
  stripeCustomerId?: string,
  stripeSubscriptionId?: string
): Promise<Doc<"subscriptions"> | null> {
  if (stripeSubscriptionId) {
    const row = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripe_subscription_id", (q) =>
        q.eq("stripeSubscriptionId", stripeSubscriptionId)
      )
      .unique();
    if (row) return row;
  }
  if (stripeCustomerId) {
    const row = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripe_customer_id", (q) => q.eq("stripeCustomerId", stripeCustomerId))
      .unique();
    if (row) return row;
  }
  return null;
}

async function upsertSubscriptionRow(
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  patch: Partial<
    Pick<
      Doc<"subscriptions">,
      "stripeCustomerId" | "stripeSubscriptionId" | "plan" | "status" | "currentPeriodEnd"
    >
  >
) {
  const existing = await ctx.db
    .query("subscriptions")
    .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
    .unique();
  if (existing) {
    await ctx.db.patch(existing._id, patch);
  } else {
    await ctx.db.insert("subscriptions", {
      organizationId,
      plan: "free",
      status: "incomplete",
      ...patch,
    });
  }
}

// Dispatch target for convex/stripeWebhook.ts's httpAction, called once per
// verified Stripe event with a flattened, JSON-safe subset of
// event.data.object (see extractStripeWebhookEventArgs). Idempotent: the
// first thing this does is record eventId, and every subsequent call with
// the same eventId is a no-op — Stripe redelivers events on retry/timeout,
// so this must be safe to call more than once for the same event.
export const processStripeWebhookEvent = internalMutation({
  args: {
    eventId: v.string(),
    eventType: v.string(),
    organizationId: v.optional(v.id("organizations")),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    rawStatus: v.optional(v.string()),
    currentPeriodEnd: v.optional(v.number()),
    isFinalPaymentFailure: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const alreadyProcessed = await recordEventOnce(ctx, args.eventId, args.eventType);
    if (alreadyProcessed) return;

    switch (args.eventType) {
      case "checkout.session.completed": {
        if (!args.organizationId || !args.stripeCustomerId || !args.stripeSubscriptionId) return;
        await upsertSubscriptionRow(ctx, args.organizationId, {
          stripeCustomerId: args.stripeCustomerId,
          stripeSubscriptionId: args.stripeSubscriptionId,
          plan: "pro",
          status: "active",
        });
        await applyReUpgradeToPro(ctx, args.organizationId);
        return;
      }

      case "customer.subscription.updated": {
        const row = await findSubscriptionByStripeIds(
          ctx,
          args.stripeCustomerId,
          args.stripeSubscriptionId
        );
        if (!row) return;
        const status = mapStripeSubscriptionStatus(args.rawStatus ?? "");
        await upsertSubscriptionRow(ctx, row.organizationId, {
          stripeCustomerId: args.stripeCustomerId ?? row.stripeCustomerId,
          stripeSubscriptionId: args.stripeSubscriptionId ?? row.stripeSubscriptionId,
          plan: status === "active" ? "pro" : "free",
          status,
          currentPeriodEnd: args.currentPeriodEnd,
        });
        // Only restore on recovery to active — don't downgrade here for
        // past_due/etc, that's reserved for .deleted and a *final*
        // payment_failed (see below) so a mid-retry blip doesn't unpublish
        // content that a successful retry would've kept live.
        if (status === "active") {
          await applyReUpgradeToPro(ctx, row.organizationId);
        }
        return;
      }

      case "customer.subscription.deleted": {
        const row = await findSubscriptionByStripeIds(
          ctx,
          args.stripeCustomerId,
          args.stripeSubscriptionId
        );
        if (!row) return;
        await upsertSubscriptionRow(ctx, row.organizationId, {
          plan: "free",
          status: "canceled",
        });
        await applyDowngradeToFree(ctx, row.organizationId);
        return;
      }

      case "invoice.payment_failed": {
        if (!args.isFinalPaymentFailure) return;
        const row = await findSubscriptionByStripeIds(
          ctx,
          args.stripeCustomerId,
          args.stripeSubscriptionId
        );
        if (!row) return;
        await upsertSubscriptionRow(ctx, row.organizationId, {
          plan: "free",
          status: "past_due",
        });
        await applyDowngradeToFree(ctx, row.organizationId);
        return;
      }

      default:
        // Unrecognized event type: already recorded as processed above,
        // nothing else to do.
        return;
    }
  },
});
