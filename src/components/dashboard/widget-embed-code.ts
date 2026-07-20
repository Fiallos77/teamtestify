// The embed snippet and hosted-page link a widget owner copies onto their own
// site (or shares directly). Shared by the standalone widget editor and the
// creation flow's final step so both present the exact same code.
import type { Id } from "../../../convex/_generated/dataModel";

export function buildEmbedSnippet(origin: string, widgetId: Id<"widgets">): string {
  return `<div data-testimonial-widget="${widgetId}"></div>\n<script src="${origin}/embed.js" async></script>`;
}

export function buildHostedUrl(origin: string, widgetId: Id<"widgets">): string {
  return `${origin}/embed/${widgetId}`;
}
