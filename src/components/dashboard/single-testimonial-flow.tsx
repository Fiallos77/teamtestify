"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Play } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { SingleTestimonial } from "@/components/embed/single-testimonial";
import {
  appearanceStateToFilter,
  appearanceStateToStyle,
  defaultAppearanceState,
  type WidgetAppearanceState,
} from "@/components/dashboard/widget-appearance";
import { WidgetAppearanceForm } from "@/components/dashboard/widget-appearance-form";
import { WidgetPreview } from "@/components/dashboard/widget-preview";
import { WidgetReadyScreen } from "@/components/dashboard/widget-ready-screen";
import {
  SINGLE_TESTIMONIAL_TEXT_EXAMPLE,
  SINGLE_TESTIMONIAL_VIDEO_EXAMPLE,
} from "@/components/dashboard/widget-layout-presets";

type Step = "pick" | "customize" | "ready";

function StepLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
      {children}
    </p>
  );
}

// No real sample video asset exists to play, so the video example is a
// lightweight static mock rather than a broken <video> element — it still
// shows real-looking author details, just not live-rendered playback.
function VideoExampleCard() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Play className="size-6" />
        </div>
        <div>
          <p className="font-medium">{SINGLE_TESTIMONIAL_VIDEO_EXAMPLE.authorName}</p>
          <p className="text-sm text-muted-foreground">
            {SINGLE_TESTIMONIAL_VIDEO_EXAMPLE.authorTitle} ·{" "}
            {SINGLE_TESTIMONIAL_VIDEO_EXAMPLE.authorCompany}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">Video testimonial example</p>
      </CardContent>
    </Card>
  );
}

// This app has no per-testimonial "get embed code" action in the Inbox (the
// spec's original design assumed one), so this keeps a lightweight in-page
// path instead: two illustrative examples, then a real picker over the
// space's approved testimonials, a short appearance pass, and the same
// shared "ready" screen Wall of Love ends on. Deliberately not tabbed like
// Wall of Love's step 2 — there's much less to configure for one
// testimonial, and WidgetAppearanceForm already hides all wall-only
// sections for type "single".
export function SingleTestimonialFlow({
  spaceId,
  onExit,
}: {
  spaceId: Id<"spaces">;
  onExit: () => void;
}) {
  const [step, setStep] = useState<Step>("pick");
  const [name, setName] = useState("");
  const [testimonialId, setTestimonialId] = useState("");
  const [appearance, setAppearance] = useState<WidgetAppearanceState>(
    defaultAppearanceState("single")
  );
  const [saving, setSaving] = useState(false);
  const [widgetId, setWidgetId] = useState<Id<"widgets"> | null>(null);

  const approvedTestimonials = useQuery(api.testimonials.listBySpace, {
    spaceId,
    status: "approved",
    limit: 1000,
  })?.items;
  const createWidget = useMutation(api.widgets.create);
  const previewPayload = useQuery(
    api.widgets.getPreviewPayload,
    step === "customize" && testimonialId
      ? {
          spaceId,
          type: "single",
          singleTestimonialId: testimonialId as Id<"testimonials">,
          filter: appearanceStateToFilter(appearance),
        }
      : "skip"
  );

  function patchAppearance(patch: Partial<WidgetAppearanceState>) {
    setAppearance((prev) => ({ ...prev, ...patch }));
  }

  async function handleSaveAndContinue() {
    setSaving(true);
    try {
      const id = await createWidget({
        spaceId,
        name,
        type: "single",
        singleTestimonialId: testimonialId as Id<"testimonials">,
        filter: appearanceStateToFilter(appearance),
        style: appearanceStateToStyle("single", appearance),
      });
      setWidgetId(id);
      setStep("ready");
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setStep("pick");
    setName("");
    setTestimonialId("");
    setAppearance(defaultAppearanceState("single"));
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

  if (step === "pick") {
    return (
      <div className="max-w-2xl space-y-6">
        <div>
          <h2 className="text-xl font-semibold">Single testimonial</h2>
          <p className="text-sm text-muted-foreground">
            Embed one testimonial anywhere on your site — as a video or a text quote.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <VideoExampleCard />
          <Card>
            <CardContent className="py-4">
              <SingleTestimonial
                testimonial={SINGLE_TESTIMONIAL_TEXT_EXAMPLE}
                style={{ theme: "auto", layout: "grid", showRating: true, showAvatar: true }}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-2">
          <Label>Choose a testimonial</Label>
          <Select value={testimonialId} onValueChange={(v) => setTestimonialId(v ?? "")}>
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

        <Button onClick={() => setStep("customize")} disabled={!testimonialId}>
          Next
        </Button>
      </div>
    );
  }

  if (step === "customize") {
    const canSave = name.trim().length > 0;
    return (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="max-w-2xl space-y-6">
          <h2 className="text-xl font-semibold">Customize your testimonial widget</h2>
          <div className="space-y-2">
            <Label htmlFor="single-name">Name</Label>
            <Input
              id="single-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Homepage quote"
            />
          </div>
          <WidgetAppearanceForm type="single" state={appearance} onChange={patchAppearance} />
          <Button onClick={handleSaveAndContinue} disabled={!canSave || saving}>
            {saving ? "Saving…" : "Save & Continue"}
          </Button>
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <StepLabel>Live preview</StepLabel>
          <WidgetPreview
            type="single"
            style={appearanceStateToStyle("single", appearance)}
            testimonials={previewPayload?.testimonials ?? []}
          />
        </div>
      </div>
    );
  }

  if (!widgetId) return null;
  return (
    <WidgetReadyScreen
      title="Your testimonial widget is ready!"
      widgetId={widgetId}
      onDone={handleDone}
      onCancel={handleCancel}
    />
  );
}
