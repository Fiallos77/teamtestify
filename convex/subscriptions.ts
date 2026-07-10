import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

// Internal only — not reachable from the client. There is no Stripe
// integration yet (Phase 2 of teamtestify-v2-spec.md); this exists purely
// so entitlements can be exercised in dev/tests: run it from the Convex
// dashboard or `npx convex run subscriptions:setPlanForTesting`.
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
  },
});
