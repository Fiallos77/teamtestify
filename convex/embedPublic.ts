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
