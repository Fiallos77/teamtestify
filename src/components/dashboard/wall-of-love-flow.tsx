"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  appearanceStateToFilter,
  appearanceStateToStyle,
  type WidgetAppearanceState,
} from "@/components/dashboard/widget-appearance";
import { WidgetBasicFields, WidgetAdvancedFields } from "@/components/dashboard/widget-appearance-sections";
import { WidgetPreview } from "@/components/dashboard/widget-preview";
import { WidgetReadyScreen } from "@/components/dashboard/widget-ready-screen";
import {
  WALL_LAYOUT_PRESETS,
  getWallSampleTestimonials,
  type WidgetLayoutPreset,
} from "@/components/dashboard/widget-layout-presets";

type Step = "layout" | "customize" | "ready";

function StepLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
      {children}
    </p>
  );
}

// Not a <button>: the carousel preset's preview renders its own nav-dot
// <button>s, and HTML forbids a <button> descendant of a <button>. A div
// with button semantics gets the same click + keyboard affordance without
// nesting interactive elements.
function LayoutPresetCard({
  preset,
  onSelect,
}: {
  preset: WidgetLayoutPreset;
  onSelect: () => void;
}) {
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
      className="cursor-pointer rounded-xl border p-3 text-left transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <div className="pointer-events-none mb-3 max-h-52 overflow-hidden rounded-lg">
        <WidgetPreview
          type="wall"
          style={appearanceStateToStyle("wall", preset.appearance)}
          testimonials={getWallSampleTestimonials()}
        />
      </div>
      <p className="text-sm font-medium">{preset.label}</p>
      <p className="text-xs text-muted-foreground">{preset.description}</p>
    </div>
  );
}

function CustomCardsTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Custom cards</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Insert your own call-to-action cards between testimonials on the wall — coming soon.
        </p>
      </CardContent>
    </Card>
  );
}

const LAYOUT_LABELS: Record<WidgetAppearanceState["layout"], string> = {
  grid: "Grid",
  masonry: "Masonry fixed",
  "masonry-animated": "Masonry animated",
  carousel: "Carousel",
};

// The Wall of Love creation flow: Step 1 picks a layout (advances
// immediately), Step 2 names it and customizes appearance across three tabs
// (Basic/Advanced/Custom cards — no AI style tab), Step 3 shows the embed
// code. The widget itself is only created once, when Step 2's "Save &
// Continue" is pressed — so there's no in-between draft to accidentally
// duplicate. Cancelling Step 3 deletes it and resets back to nothing.
export function WallOfLoveFlow({
  spaceId,
  onExit,
}: {
  spaceId: Id<"spaces">;
  onExit: () => void;
}) {
  const [step, setStep] = useState<Step>("layout");
  const [name, setName] = useState("");
  const [appearance, setAppearance] = useState<WidgetAppearanceState>(
    WALL_LAYOUT_PRESETS[0].appearance
  );
  const [saving, setSaving] = useState(false);
  const [widgetId, setWidgetId] = useState<Id<"widgets"> | null>(null);

  const createWidget = useMutation(api.widgets.create);
  const previewPayload = useQuery(
    api.widgets.getPreviewPayload,
    step === "customize"
      ? { spaceId, type: "wall", filter: appearanceStateToFilter(appearance) }
      : "skip"
  );

  function handlePickLayout(preset: WidgetLayoutPreset) {
    setAppearance(preset.appearance);
    setStep("customize");
  }

  function patchAppearance(patch: Partial<WidgetAppearanceState>) {
    setAppearance((prev) => ({ ...prev, ...patch }));
  }

  async function handleSaveAndContinue() {
    setSaving(true);
    try {
      const id = await createWidget({
        spaceId,
        name,
        type: "wall",
        filter: appearanceStateToFilter(appearance),
        style: appearanceStateToStyle("wall", appearance),
      });
      setWidgetId(id);
      setStep("ready");
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setStep("layout");
    setName("");
    setAppearance(WALL_LAYOUT_PRESETS[0].appearance);
    setWidgetId(null);
  }

  function handleDone() {
    reset();
    onExit();
  }

  function handleCancel() {
    reset();
    onExit();
  }

  if (step === "layout") {
    return (
      <div>
        <StepLabel>Step 1 of 3</StepLabel>
        <div className="mb-5">
          <h2 className="text-xl font-semibold">Choose a layout</h2>
          <p className="text-sm text-muted-foreground">
            Pick how your Wall of Love scrolls — you&apos;ll customize colors and content next.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {WALL_LAYOUT_PRESETS.map((preset) => (
            <LayoutPresetCard
              key={preset.id}
              preset={preset}
              onSelect={() => handlePickLayout(preset)}
            />
          ))}
        </div>
      </div>
    );
  }

  if (step === "customize") {
    const canSave = name.trim().length > 0;
    return (
      <div>
        <StepLabel>Step 2 of 3</StepLabel>
        <div className="mb-5">
          <h2 className="text-xl font-semibold">Customize your Wall of Love</h2>
          <p className="text-sm text-muted-foreground">
            Layout: {LAYOUT_LABELS[appearance.layout]}
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="max-w-2xl space-y-6">
            <div className="space-y-2">
              <Label htmlFor="wall-name">Name</Label>
              <Input
                id="wall-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Homepage wall"
              />
            </div>

            <Tabs defaultValue="basic">
              <TabsList>
                <TabsTrigger value="basic">Basic</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
                <TabsTrigger value="custom-cards">Custom cards</TabsTrigger>
              </TabsList>
              <TabsContent value="basic" className="pt-4">
                <WidgetBasicFields state={appearance} onChange={patchAppearance} />
              </TabsContent>
              <TabsContent value="advanced" className="pt-4">
                <WidgetAdvancedFields state={appearance} onChange={patchAppearance} />
              </TabsContent>
              <TabsContent value="custom-cards" className="pt-4">
                <CustomCardsTab />
              </TabsContent>
            </Tabs>

            <Button onClick={handleSaveAndContinue} disabled={!canSave || saving}>
              {saving ? "Saving…" : "Save & Continue"}
            </Button>
          </div>

          <div className="lg:sticky lg:top-6 lg:self-start">
            <StepLabel>Live preview</StepLabel>
            <WidgetPreview
              type="wall"
              style={appearanceStateToStyle("wall", appearance)}
              testimonials={previewPayload?.testimonials ?? []}
            />
          </div>
        </div>
      </div>
    );
  }

  if (!widgetId) return null;
  return (
    <div>
      <StepLabel>Step 3 of 3</StepLabel>
      <WidgetReadyScreen
        title="Your Wall of Love is Ready!"
        widgetId={widgetId}
        onDone={handleDone}
        onCancel={handleCancel}
      />
    </div>
  );
}
