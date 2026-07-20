"use client";

import { cn } from "@/lib/utils";
import { WidgetPreview } from "@/components/dashboard/widget-preview";
import { appearanceStateToStyle, type WidgetAppearanceState } from "@/components/dashboard/widget-appearance";
import {
  getSampleTestimonials,
  getStylePresets,
  isSameAppearance,
  type WidgetStylePreset,
} from "@/components/dashboard/widget-style-presets";

function PresetCard({
  preset,
  selected,
  onSelect,
}: {
  preset: WidgetStylePreset;
  selected: boolean;
  onSelect: () => void;
}) {
  // Not a <button>: the carousel preset's preview renders its own nav-dot
  // <button>s, and HTML forbids a <button> descendant of a <button> (it broke
  // hydration). A div with button semantics gets the same click + keyboard
  // affordance without nesting interactive elements.
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      aria-pressed={selected}
      className={cn(
        "w-full cursor-pointer rounded-xl border p-3 text-left transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        selected ? "border-primary ring-2 ring-primary/20" : "border-border"
      )}
    >
      {/* The mini preview is for looking at, not interacting with — clicks
          anywhere on the card (including over a carousel's own nav dots)
          should select the preset, not drive the sample widget. */}
      <div className="pointer-events-none mb-3 max-h-52 overflow-hidden rounded-lg">
        <WidgetPreview
          type={preset.type}
          style={appearanceStateToStyle(preset.type, preset.appearance)}
          testimonials={getSampleTestimonials(preset.type)}
        />
      </div>
      <p className="text-sm font-medium">{preset.label}</p>
      <p className="text-xs text-muted-foreground">{preset.description}</p>
    </div>
  );
}

function PresetGroup({
  title,
  type,
  selectedType,
  selectedAppearance,
  onSelect,
}: {
  title: string;
  type: "wall" | "single";
  selectedType: "wall" | "single";
  selectedAppearance: WidgetAppearanceState;
  onSelect: (type: "wall" | "single", appearance: WidgetAppearanceState) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {getStylePresets(type).map((preset) => (
          <PresetCard
            key={preset.id}
            preset={preset}
            selected={
              selectedType === preset.type && isSameAppearance(selectedAppearance, preset.appearance)
            }
            onSelect={() => onSelect(preset.type, preset.appearance)}
          />
        ))}
      </div>
    </div>
  );
}

// Step 1 of the creation flow: a visual gallery of style presets, grouped by
// the existing widget types (no new types). Clicking a card highlights it and
// seeds type + appearance for the rest of the flow — it doesn't advance the
// step itself, so a stray click can't lose whatever the flow already had
// selected (the caller's explicit Next button does that).
export function WidgetStylePicker({
  selectedType,
  selectedAppearance,
  onSelect,
}: {
  selectedType: "wall" | "single";
  selectedAppearance: WidgetAppearanceState;
  onSelect: (type: "wall" | "single", appearance: WidgetAppearanceState) => void;
}) {
  return (
    <div className="space-y-6">
      <PresetGroup
        title="Wall of Love"
        type="wall"
        selectedType={selectedType}
        selectedAppearance={selectedAppearance}
        onSelect={onSelect}
      />
      <PresetGroup
        title="Single testimonial"
        type="single"
        selectedType={selectedType}
        selectedAppearance={selectedAppearance}
        onSelect={onSelect}
      />
    </div>
  );
}
