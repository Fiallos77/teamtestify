"use client";

import { use, useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { testimonialLabel } from "@/lib/testimonial-label";
import {
  appearanceStateFromWidget,
  appearanceStateToFilter,
  appearanceStateToStyle,
  type WidgetAppearanceState,
} from "@/components/dashboard/widget-appearance";
import { WidgetAppearanceForm } from "@/components/dashboard/widget-appearance-form";
import { buildEmbedSnippet, buildHostedUrl } from "@/components/dashboard/widget-embed-code";

export default function WidgetEditorPage({
  params,
}: {
  params: Promise<{ spaceId: string; widgetId: string }>;
}) {
  const { spaceId, widgetId } = use(params);
  return (
    <WidgetEditor spaceId={spaceId as Id<"spaces">} widgetId={widgetId as Id<"widgets">} />
  );
}

function WidgetEditor({
  spaceId,
  widgetId,
}: {
  spaceId: Id<"spaces">;
  widgetId: Id<"widgets">;
}) {
  const update = useMutation(api.widgets.update);
  const widget = useQuery(api.widgets.getById, { widgetId });
  // The widget picker needs every approved testimonial, so opt out of the
  // paginated default with a high limit and read the items array.
  const approvedTestimonials = useQuery(api.testimonials.listBySpace, {
    spaceId,
    status: "approved",
    limit: 1000,
  })?.items;

  const [name, setName] = useState("");
  const [type, setType] = useState<"wall" | "single">("wall");
  const [singleTestimonialId, setSingleTestimonialId] = useState<string>("");
  const [appearance, setAppearance] = useState<WidgetAppearanceState | null>(null);
  const [isPublished, setIsPublished] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Seed the form once the widget doc loads — the standard "sync local
    // editable state from an async-loaded source" pattern used across this
    // app's editors.
    if (!widget) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(widget.name);
    setType(widget.type);
    setSingleTestimonialId(widget.singleTestimonialId ?? "");
    setAppearance(appearanceStateFromWidget(widget));
    setIsPublished(widget.isPublished);
  }, [widget]);

  function patchAppearance(patch: Partial<WidgetAppearanceState>) {
    setAppearance((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  if (!widget || !appearance) return <p className="text-muted-foreground">Loading…</p>;

  async function handleSave() {
    if (!appearance) return;
    await update({
      widgetId,
      name,
      type,
      singleTestimonialId:
        type === "single" && singleTestimonialId
          ? (singleTestimonialId as Id<"testimonials">)
          : undefined,
      isPublished,
      style: appearanceStateToStyle(type, appearance),
      filter: appearanceStateToFilter(appearance),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const appOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const snippet = buildEmbedSnippet(appOrigin, widgetId);
  const hostedUrl = buildHostedUrl(appOrigin, widgetId);

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Widget settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Published</Label>
            <Switch checked={isPublished} onCheckedChange={setIsPublished} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="widget-name">Name</Label>
            <Input id="widget-name" value={name} onChange={(e) => setName(e.target.value)} />
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

          <WidgetAppearanceForm type={type} state={appearance} onChange={patchAppearance} />
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave}>Save changes</Button>
        {saved && <span className="text-sm text-muted-foreground">Saved</span>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Share</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="snippet">
            <TabsList>
              <TabsTrigger value="snippet">Embed snippet</TabsTrigger>
              <TabsTrigger value="hosted">Hosted page link</TabsTrigger>
            </TabsList>
            <TabsContent value="snippet" className="pt-4">
              <pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs">{snippet}</pre>
              <Button
                variant="outline"
                className="mt-3"
                onClick={() => navigator.clipboard.writeText(snippet)}
              >
                Copy snippet
              </Button>
            </TabsContent>
            <TabsContent value="hosted" className="pt-4">
              <p className="mb-3 text-sm text-muted-foreground">
                A direct link you can share anywhere — no need to embed it on your own site.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Input readOnly value={hostedUrl} className="min-w-0 flex-1 text-xs" />
                <Button variant="outline" onClick={() => navigator.clipboard.writeText(hostedUrl)}>
                  Copy
                </Button>
                <a href={hostedUrl} target="_blank" rel="noreferrer">
                  <Button variant="outline">Open</Button>
                </a>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
