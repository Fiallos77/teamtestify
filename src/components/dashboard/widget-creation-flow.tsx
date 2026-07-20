"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { testimonialLabel } from "@/lib/testimonial-label";
import {
  appearanceStateToFilter,
  appearanceStateToStyle,
  type WidgetAppearanceState,
} from "@/components/dashboard/widget-appearance";
import { WidgetAppearanceForm } from "@/components/dashboard/widget-appearance-form";
import { WidgetPreview } from "@/components/dashboard/widget-preview";
import { WidgetStylePicker } from "@/components/dashboard/widget-style-picker";
import { WIDGET_STYLE_PRESETS } from "@/components/dashboard/widget-style-presets";
import { buildEmbedSnippet, buildHostedUrl } from "@/components/dashboard/widget-embed-code";

type Step = "style" | "type" | "customize";

const STEP_NUMBER: Record<Step, number> = { style: 1, type: 2, customize: 3 };

function StepIndicator({ step }: { step: Step }) {
  return (
    <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
      Step {STEP_NUMBER[step]} of 3
    </p>
  );
}

// First preset in the gallery — used to seed the flow's initial type/
// appearance so step 2's Next is never blocked and step 1 opens with a
// card already highlighted, without forcing the user to click one first.
const INITIAL_PRESET = WIDGET_STYLE_PRESETS[0];

// 3-step widget creation, all state lifted into this one component so
// Back/Next never lose data — every field (name/type/testimonial/appearance)
// lives here regardless of which step is currently rendered.
//
// Step 1 (style): a gallery of appearance presets grouped by the existing
// widget types. Picking one seeds type + appearance below; it doesn't create
// anything yet.
// Step 2 (type): name, type, and (for a single testimonial) which one — the
// same fields the old single-step dialog collected. Next creates the widget
// the first time; going Back to step 1 and forward again re-enters this step
// with everything intact, and Next only *updates* the already-created widget
// instead of creating a duplicate.
// Step 3 (customize): the standalone editor's appearance controls + live
// preview + embed code, pre-filled from step 1's pick and still fully
// editable, unchanged from the previous flow apart from the added Back.
export function WidgetCreationFlow({ spaceId }: { spaceId: Id<"spaces"> }) {
  const [step, setStep] = useState<Step>("style");
  const [name, setName] = useState("");
  const [type, setType] = useState<"wall" | "single">(INITIAL_PRESET.type);
  const [singleTestimonialId, setSingleTestimonialId] = useState<string>("");
  const [appearance, setAppearance] = useState<WidgetAppearanceState>(INITIAL_PRESET.appearance);
  const [creating, setCreating] = useState(false);
  const [widgetId, setWidgetId] = useState<Id<"widgets"> | null>(null);

  const approvedTestimonials = useQuery(api.testimonials.listBySpace, {
    spaceId,
    status: "approved",
    limit: 1000,
  })?.items;
  const createWidget = useMutation(api.widgets.create);
  const updateWidget = useMutation(api.widgets.update);
  const previewPayload = useQuery(
    api.widgets.getPreviewPayload,
    step === "customize"
      ? {
          spaceId,
          type,
          singleTestimonialId:
            type === "single" && singleTestimonialId
              ? (singleTestimonialId as Id<"testimonials">)
              : undefined,
          filter: appearanceStateToFilter(appearance),
        }
      : "skip"
  );

  // Shared by the step 1 gallery (preset click) and the step 2 Type dropdown
  // (which keeps the current appearance rather than resetting to a preset —
  // switching type there is a correction, not a fresh style pick).
  function setTypeAndAppearance(nextType: "wall" | "single", nextAppearance: WidgetAppearanceState) {
    setType(nextType);
    setAppearance(nextAppearance);
    // Switching type invalidates any single-testimonial pick made under the
    // other type.
    if (nextType !== "single") setSingleTestimonialId("");
  }

  function patchAppearance(patch: Partial<WidgetAppearanceState>) {
    setAppearance((prev) => ({ ...prev, ...patch }));
  }

  // Creates the widget the first time this is reached; on any later visit
  // (Back then Next again) the widget already exists, so this just syncs the
  // identity fields onto it instead of creating a second, duplicate widget.
  async function handleNext() {
    setCreating(true);
    try {
      const resolvedSingleTestimonialId =
        type === "single" && singleTestimonialId
          ? (singleTestimonialId as Id<"testimonials">)
          : undefined;
      if (widgetId) {
        await updateWidget({
          widgetId,
          name,
          type,
          singleTestimonialId: resolvedSingleTestimonialId,
        });
      } else {
        const id = await createWidget({
          spaceId,
          name,
          type,
          singleTestimonialId: resolvedSingleTestimonialId,
          filter: appearanceStateToFilter(appearance),
          style: appearanceStateToStyle(type, appearance),
        });
        setWidgetId(id);
      }
      setStep("customize");
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveAppearance() {
    if (!widgetId) return;
    await updateWidget({
      widgetId,
      style: appearanceStateToStyle(type, appearance),
      filter: appearanceStateToFilter(appearance),
    });
  }

  const canProceedDetails =
    name.trim().length > 0 && (type !== "single" || !!singleTestimonialId);

  if (step === "style") {
    return (
      <div className="max-w-3xl">
        <StepIndicator step={step} />
        <div className="mb-5">
          <h2 className="text-xl font-semibold">Choose a style</h2>
          <p className="text-sm text-muted-foreground">
            Pick a starting point — every detail stays fully editable in the next steps.
          </p>
        </div>
        <WidgetStylePicker
          selectedType={type}
          selectedAppearance={appearance}
          onSelect={setTypeAndAppearance}
        />
        <div className="mt-6">
          <Button onClick={() => setStep("type")}>Next</Button>
        </div>
      </div>
    );
  }

  if (step === "type") {
    return (
      <div className="max-w-lg">
        <StepIndicator step={step} />
        <Card>
          <CardHeader>
            <CardTitle>Widget details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="widget-name">Name</Label>
              <Input
                id="widget-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Homepage wall"
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={type}
                onValueChange={(v) => setTypeAndAppearance(v as "wall" | "single", appearance)}
              >
                <SelectTrigger>
                  <SelectValue>
                    {(v: string) => (v === "single" ? "Single testimonial" : "Wall of Love")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wall">Wall of Love</SelectItem>
                  <SelectItem value="single">Single testimonial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {type === "single" && (
              <div className="space-y-2">
                <Label>Testimonial</Label>
                <Select
                  value={singleTestimonialId}
                  onValueChange={(v) => setSingleTestimonialId(v ?? "")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a testimonial">
                      {(v: string) => testimonialLabel(approvedTestimonials, v)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {approvedTestimonials?.map((t) => (
                      <SelectItem key={t._id} value={t._id}>
                        {t.authorName}
                        {t.textContent ? ` — ${t.textContent.slice(0, 40)}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => setStep("style")}>
                Back
              </Button>
              <Button onClick={handleNext} disabled={!canProceedDetails || creating}>
                {creating ? "Saving…" : "Next"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const appOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const snippet = widgetId ? buildEmbedSnippet(appOrigin, widgetId) : "";
  const hostedUrl = widgetId ? buildHostedUrl(appOrigin, widgetId) : "";

  return (
    <div>
      <StepIndicator step={step} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="max-w-2xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customize appearance</CardTitle>
            </CardHeader>
            <CardContent>
              <WidgetAppearanceForm type={type} state={appearance} onChange={patchAppearance} />
            </CardContent>
          </Card>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setStep("type")}>
              Back
            </Button>
            <Button onClick={handleSaveAppearance}>Save appearance</Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Embed code</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs">{snippet}</pre>
                <Button
                  variant="outline"
                  className="mt-3"
                  onClick={() => navigator.clipboard.writeText(snippet)}
                >
                  Copy snippet
                </Button>
              </div>
              <div>
                <p className="mb-2 text-sm text-muted-foreground">
                  Or share the hosted page directly — no embedding required.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Input readOnly value={hostedUrl} className="min-w-0 flex-1 text-xs" />
                  <Button
                    variant="outline"
                    onClick={() => navigator.clipboard.writeText(hostedUrl)}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/dashboard/spaces/${spaceId}/widgets`} />}
          >
            Done
          </Button>
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Live preview
          </p>
          <WidgetPreview
            type={type}
            style={appearanceStateToStyle(type, appearance)}
            testimonials={previewPayload?.testimonials ?? []}
          />
        </div>
      </div>
    </div>
  );
}
