import { v } from "convex/values";
import { query } from "./_generated/server";
import { buildWidgetPayload } from "./lib/widgetPayload";

// Callable directly from the client-rendered iframe embed page (unlike
// embed.getWidgetPayload, which is internal-only for the legacy HTTP route).
export const getWidgetPayload = query({
  args: { widgetId: v.id("widgets") },
  handler: async (ctx, { widgetId }) => {
    return await buildWidgetPayload(ctx, widgetId);
  },
});

// Just enough to build the embed page's <title>/OG tags server-side
// (generateMetadata, called before the widget itself is fetched) — the
// business's own name, not the widget's internal name. Same publish gate as
// getWidgetPayload so an unpublished widget's space name never leaks.
export const getWidgetMeta = query({
  args: { widgetId: v.id("widgets") },
  handler: async (ctx, { widgetId }) => {
    const widget = await ctx.db.get(widgetId);
    if (!widget || !widget.isPublished) return null;
    const space = await ctx.db.get(widget.spaceId);
    if (!space) return null;
    return { spaceName: space.name, headline: space.formConfig.headline };
  },
});
