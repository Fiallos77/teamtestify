import type { WidgetAppearanceState } from "./widget-appearance";
import type { WidgetLayoutPreset } from "./widget-layout-presets";

export type WallStep = "layout" | "customize" | "ready";

// One step back in the 3-step Wall of Love flow. There's nothing before
// "layout" — Back is only ever rendered on customize/ready, so that branch
// just keeps the caller from crashing if it's ever called there anyway.
export function stepBack(step: WallStep): WallStep {
  if (step === "ready") return "customize";
  if (step === "customize") return "layout";
  return step;
}

// Once a draft widget has been created (Save & Continue was pressed at
// least once), going Back and saving again must PATCH that same row, not
// insert a second one.
export function resolveSaveMode(existingWidgetId: unknown): "create" | "update" {
  return existingWidgetId ? "update" : "create";
}

// Re-selecting the layout you're already on (e.g. after Back) must not
// clobber Basic/Advanced customization made in Step 2 — only switching to a
// genuinely different layout resets to that preset's defaults.
export function resolveLayoutSelection(
  currentAppearance: WidgetAppearanceState,
  preset: WidgetLayoutPreset
): WidgetAppearanceState {
  if (currentAppearance.layout === preset.layout) return currentAppearance;
  return preset.appearance;
}
