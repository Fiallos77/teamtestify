import type { Doc } from "../../../convex/_generated/dataModel";

// The space's "Wall of Love" public page, on the Pages tab, needs one widget
// to link to even though a space can have several wall-type widgets (there's
// no "primary widget" concept in the schema). Prefer a published one — that's
// the one actually live for visitors — falling back to the first wall widget
// created if none is published yet, so there's still something to preview/
// finish setting up; null only when the space has no wall widget at all.
export function selectWallWidget(widgets: Doc<"widgets">[]): Doc<"widgets"> | null {
  const wallWidgets = widgets.filter((w) => w.type === "wall");
  if (wallWidgets.length === 0) return null;
  return wallWidgets.find((w) => w.isPublished) ?? wallWidgets[0];
}
