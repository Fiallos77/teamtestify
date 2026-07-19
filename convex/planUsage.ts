import { query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { tryOrgContext } from "./lib/authz";
import { getEntitlements, aiTotalLimit, aiTotalUsed } from "./entitlements";
import { currentMonth } from "./ai";

// Live plan + usage for the dashboard and the account Plan tab. Every limit
// comes from convex/entitlements.ts (the plan matrix), never a hardcoded UI
// constant, so Free and Pro render correct numbers automatically. Page-safe:
// returns null before an org is active, like the other dashboard reads.
export const getPlanUsage = query({
  args: {},
  handler: async (ctx) => {
    const orgContext = await tryOrgContext(ctx);
    if (!orgContext) return null;
    const organizationId: Id<"organizations"> = orgContext.org._id;
    const entitlements = await getEntitlements(ctx, organizationId);

    const spaces = await ctx.db
      .query("spaces")
      .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
      .collect();

    const testimonials = await ctx.db
      .query("testimonials")
      .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
      .collect();
    const publishedVideos = testimonials.filter(
      (testimonial) => testimonial.status === "approved" && testimonial.type === "video"
    ).length;

    const month = currentMonth();
    const aiRow = await ctx.db
      .query("aiUsage")
      .withIndex("by_org_and_month", (q) =>
        q.eq("organizationId", organizationId).eq("month", month)
      )
      .unique();
    const aiUsage = {
      requestGenCount: aiRow?.requestGenCount ?? 0,
      imageGenCount: aiRow?.imageGenCount ?? 0,
    };

    return {
      plan: entitlements.plan,
      spaces: { used: spaces.length, limit: entitlements.maxSpaces },
      publishedVideoTestimonials: {
        used: publishedVideos,
        limit: entitlements.maxPublishedVideoTestimonials,
      },
      aiGenerations: {
        used: aiTotalUsed(aiUsage),
        limit: aiTotalLimit(entitlements.aiQuota),
        month,
      },
    };
  },
});
