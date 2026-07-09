import { v } from "convex/values";
import { internalQuery, mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { buildWidgetPayload } from "./lib/widgetPayload";

// Kept for the existing `/embed/widget` JSON HTTP route (convex/http.ts) —
// back-compat for anything already embedded via the old script snippet.
export const getWidgetPayload = internalQuery({
  args: { widgetId: v.string() },
  handler: async (ctx, { widgetId }) => {
    return await buildWidgetPayload(ctx, widgetId as Id<"widgets">);
  },
});

// Plain (not internal) mutation: the new iframe embed page calls this
// directly via useMutation. It was already reachable by anyone through the
// CORS-open `/embed/event` HTTP route, so this doesn't widen exposure.
export const logEvent = mutation({
  args: {
    widgetId: v.string(),
    type: v.union(v.literal("impression"), v.literal("click")),
    testimonialId: v.optional(v.string()),
  },
  handler: async (ctx, { widgetId, type, testimonialId }) => {
    const widget = await ctx.db.get(widgetId as Id<"widgets">).catch(() => null);
    if (!widget) return;
    await ctx.db.insert("widgetEvents", {
      widgetId: widget._id,
      type,
      testimonialId: testimonialId ? (testimonialId as Id<"testimonials">) : undefined,
      ts: Date.now(),
    });
  },
});
