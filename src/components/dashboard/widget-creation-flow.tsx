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
  defaultAppearanceState,
  type WidgetAppearanceState,
} from "@/components/dashboard/widget-appearance";
import { WidgetAppearanceForm } from "@/components/dashboard/widget-appearance-form";
import { WidgetPreview } from "@/components/dashboard/widget-preview";
import { buildEmbedSnippet, buildHostedUrl } from "@/components/dashboard/widget-embed-code";

type Step = "type" | "customize";

// 2-step widget creation: step 1 picks the widget's type (and, for a
// standalone testimonial, which one) — the existing types only, nothing new.
// Step 2 is the same appearance controls as the standalone editor
// (WidgetAppearanceForm), now paired with a live preview built from the
// in-progress settings, ending with the embed code to copy. The widget row
// itself is created right after step 1 (same moment the old single-step
// dialog created it) so step 2 is just editing that real, already-existing —
// if still unpublished — widget; abandoning step 2 leaves a draft widget
// behind exactly like the old flow did.
export function WidgetCreationFlow({ spaceId }: { spaceId: Id<"spaces"> }) {
  const [step, setStep] = useState<Step>("type");
  const [name, setName] = useState("");
  const [type, setType] = useState<"wall" | "single">("wall");
  const [singleTestimonialId, setSingleTestimonialId] = useState<string>("");
  const [creating, setCreating] = useState(false);

  const [widgetId, setWidgetId] = useState<Id<"widgets"> | null>(null);
  const [appearance, setAppearance] = useState<WidgetAppearanceState>(
    defaultAppearanceState("wall")
  );

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

  function patchAppearance(patch: Partial<WidgetAppearanceState>) {
    setAppearance((prev) => ({ ...prev, ...patch }));
  }

  async function handleNext() {
    setCreating(true);
    try {
      const initialAppearance = defaultAppearanceState(type);
      const id = await createWidget({
        spaceId,
        name,
        type,
        singleTestimonialId:
          type === "single" && singleTestimonialId
            ? (singleTestimonialId as Id<"testimonials">)
            : undefined,
        filter: appearanceStateToFilter(initialAppearance),
        style: appearanceStateToStyle(type, initialAppearance),
      });
      setWidgetId(id);
      setAppearance(initialAppearance);
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

  const canProceed = name.trim().length > 0 && (type !== "single" || !!singleTestimonialId);

  if (step === "type") {
    return (
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Step 1 — Choose a widget type</CardTitle>
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
            <Select value={type} onValueChange={(v) => setType(v as "wall" | "single")}>
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
          <Button onClick={handleNext} disabled={!canProceed || creating}>
            {creating ? "Creating…" : "Next"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const appOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const snippet = widgetId ? buildEmbedSnippet(appOrigin, widgetId) : "";
  const hostedUrl = widgetId ? buildHostedUrl(appOrigin, widgetId) : "";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Step 2 — Customize appearance</CardTitle>
          </CardHeader>
          <CardContent>
            <WidgetAppearanceForm type={type} state={appearance} onChange={patchAppearance} />
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
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
                <Button variant="outline" onClick={() => navigator.clipboard.writeText(hostedUrl)}>
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
  );
}
