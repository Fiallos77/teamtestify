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
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { testimonialLabel } from "@/lib/testimonial-label";

type Layout = "grid" | "masonry" | "masonry-animated" | "carousel";

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
  const [theme, setTheme] = useState<"light" | "dark" | "auto">("auto");
  const [accentColor, setAccentColor] = useState("");
  const [backgroundColor, setBackgroundColor] = useState("");
  const [layout, setLayout] = useState<Layout>("grid");
  const [columns, setColumns] = useState<number | "">(3);
  const [rows, setRows] = useState<number>(1);
  const [autoplaySeconds, setAutoplaySeconds] = useState<number | "">("");
  const [showRating, setShowRating] = useState(true);
  const [showAvatar, setShowAvatar] = useState(true);
  const [showDate, setShowDate] = useState(true);
  const [scrollDirection, setScrollDirection] = useState<"vertical" | "horizontal">("vertical");
  const [scrollSpeed, setScrollSpeed] = useState<"slow" | "normal" | "fast">("normal");
  const [reverseDirection, setReverseDirection] = useState(false);
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const [onlyFeatured, setOnlyFeatured] = useState(false);
  const [maxItems, setMaxItems] = useState<number | "">("");
  const [limitHeight, setLimitHeight] = useState(true);
  const [maxHeight, setMaxHeight] = useState<number | "">(420);
  const [isPublished, setIsPublished] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!widget) return;
    setName(widget.name);
    setType(widget.type);
    setSingleTestimonialId(widget.singleTestimonialId ?? "");
    setTheme(widget.style.theme);
    setAccentColor(widget.style.accentColor ?? "");
    setBackgroundColor(widget.style.backgroundColor ?? "");
    setLayout(widget.style.layout);
    setColumns(widget.style.columns ?? 3);
    setRows(widget.style.rows ?? 1);
    setAutoplaySeconds(widget.style.autoplaySeconds ?? "");
    setShowRating(widget.style.showRating);
    setShowAvatar(widget.style.showAvatar);
    setShowDate(widget.style.showDate !== false);
    setScrollDirection(widget.style.scrollDirection ?? "vertical");
    setScrollSpeed(widget.style.scrollSpeed ?? "normal");
    setReverseDirection(widget.style.reverseDirection ?? false);
    setShowHeartAnimation(widget.style.showHeartAnimation ?? false);
    setOnlyFeatured(widget.filter.onlyFeatured ?? false);
    setMaxItems(widget.filter.maxItems ?? "");
    setLimitHeight(widget.style.maxHeight !== undefined);
    setMaxHeight(widget.style.maxHeight ?? (widget.style.layout === "masonry-animated" ? 480 : 420));
    setIsPublished(widget.isPublished);
  }, [widget]);

  if (!widget) return <p className="text-muted-foreground">Loading…</p>;

  async function handleSave() {
    await update({
      widgetId,
      name,
      type,
      singleTestimonialId:
        type === "single" && singleTestimonialId
          ? (singleTestimonialId as Id<"testimonials">)
          : undefined,
      isPublished,
      style: {
        theme,
        accentColor: accentColor || undefined,
        backgroundColor: backgroundColor || undefined,
        layout,
        columns: columns === "" ? undefined : Number(columns),
        rows: layout === "masonry-animated" && scrollDirection === "horizontal" ? rows : undefined,
        autoplaySeconds: autoplaySeconds === "" ? undefined : Number(autoplaySeconds),
        showRating,
        showAvatar,
        showDate,
        scrollDirection: layout === "masonry-animated" ? scrollDirection : undefined,
        scrollSpeed: layout === "masonry-animated" ? scrollSpeed : undefined,
        reverseDirection: layout === "masonry-animated" ? reverseDirection : undefined,
        showHeartAnimation: layout === "masonry-animated" ? showHeartAnimation : undefined,
        maxHeight:
          type === "wall" && layout === "masonry-animated"
            ? Number(maxHeight || 480)
            : type === "wall" && layout !== "carousel" && limitHeight && maxHeight !== ""
              ? Number(maxHeight)
              : undefined,
      },
      filter: {
        onlyFeatured,
        maxItems: maxItems === "" ? undefined : Number(maxItems),
      },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const appOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const snippet = `<div data-testimonial-widget="${widgetId}"></div>\n<script src="${appOrigin}/embed.js" async></script>`;
  const hostedUrl = `${appOrigin}/embed/${widgetId}`;

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

          <Separator />

          <div className="space-y-2">
            <Label>Theme</Label>
            <Select value={theme} onValueChange={(v) => setTheme(v as typeof theme)}>
              <SelectTrigger>
                <SelectValue>
                  {(v: string) => ({ auto: "Auto", light: "Light", dark: "Dark" })[v] ?? v}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="accent-color">Accent color</Label>
            <div className="flex items-center gap-2">
              <input
                id="accent-color"
                type="color"
                value={accentColor || "#6366f1"}
                onChange={(e) => setAccentColor(e.target.value)}
                className="h-8 w-10 cursor-pointer rounded border"
              />
              <Input
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                placeholder="#6366f1"
                className="max-w-40"
              />
              {accentColor && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setAccentColor("")}
                >
                  Reset
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="background-color">Background color</Label>
            <div className="flex items-center gap-2">
              <input
                id="background-color"
                type="color"
                value={backgroundColor || "#ffffff"}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="h-8 w-10 cursor-pointer rounded border"
              />
              <Input
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                placeholder="Default"
                className="max-w-40"
              />
              {backgroundColor && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setBackgroundColor("")}
                >
                  Reset
                </Button>
              )}
            </div>
          </div>

          {type === "wall" && (
            <>
              <div className="space-y-2">
                <Label>Layout</Label>
                <Select value={layout} onValueChange={(v) => setLayout(v as Layout)}>
                  <SelectTrigger>
                    <SelectValue>
                      {(v: string) =>
                        ({
                          grid: "Grid",
                          masonry: "Masonry",
                          "masonry-animated": "Masonry (animated)",
                          carousel: "Carousel",
                        })[v] ?? v
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grid">Grid</SelectItem>
                    <SelectItem value="masonry">Masonry</SelectItem>
                    <SelectItem value="masonry-animated">Masonry (animated)</SelectItem>
                    <SelectItem value="carousel">Carousel</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(layout === "grid" ||
                layout === "masonry" ||
                (layout === "masonry-animated" && scrollDirection === "vertical")) && (
                <div className="space-y-2">
                  <Label>Columns</Label>
                  <Select
                    value={String(columns || 3)}
                    onValueChange={(v) => setColumns(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue>{(v: string) => `${v} columns`}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2 columns</SelectItem>
                      <SelectItem value="3">3 columns</SelectItem>
                      <SelectItem value="4">4 columns</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {layout === "carousel" && (
                <div className="space-y-2">
                  <Label htmlFor="autoplay">Autoplay seconds</Label>
                  <Input
                    id="autoplay"
                    type="number"
                    value={autoplaySeconds}
                    onChange={(e) =>
                      setAutoplaySeconds(e.target.value === "" ? "" : Number(e.target.value))
                    }
                  />
                </div>
              )}

              {layout === "masonry-animated" && (
                <>
                  <div className="space-y-2">
                    <Label>Scroll direction</Label>
                    <Select
                      value={scrollDirection}
                      onValueChange={(v) => setScrollDirection(v as typeof scrollDirection)}
                    >
                      <SelectTrigger>
                        <SelectValue>
                          {(v: string) => ({ vertical: "Vertical", horizontal: "Horizontal" })[v] ?? v}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vertical">Vertical</SelectItem>
                        <SelectItem value="horizontal">Horizontal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {scrollDirection === "horizontal" && (
                    <div className="space-y-2">
                      <Label>Rows</Label>
                      <Select value={String(rows)} onValueChange={(v) => setRows(Number(v))}>
                        <SelectTrigger>
                          <SelectValue>{(v: string) => `${v} row${v === "1" ? "" : "s"}`}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 row</SelectItem>
                          <SelectItem value="2">2 rows</SelectItem>
                          <SelectItem value="3">3 rows</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Scroll speed</Label>
                    <Select
                      value={scrollSpeed}
                      onValueChange={(v) => setScrollSpeed(v as typeof scrollSpeed)}
                    >
                      <SelectTrigger>
                        <SelectValue>
                          {(v: string) => ({ slow: "Slow", normal: "Normal", fast: "Fast" })[v] ?? v}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="slow">Slow</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="fast">Fast</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Reverse direction</Label>
                    <Switch checked={reverseDirection} onCheckedChange={setReverseDirection} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Show heart animation</Label>
                    <Switch checked={showHeartAnimation} onCheckedChange={setShowHeartAnimation} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Pauses automatically while the visitor hovers, and never grows past the
                    height below no matter how many testimonials you have.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="max-height-animated">Max height (px)</Label>
                    <Input
                      id="max-height-animated"
                      type="number"
                      value={maxHeight}
                      onChange={(e) =>
                        setMaxHeight(e.target.value === "" ? "" : Number(e.target.value))
                      }
                    />
                  </div>
                </>
              )}

              {layout !== "carousel" && layout !== "masonry-animated" && (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Limit height</Label>
                      <p className="text-sm text-muted-foreground">
                        Keeps the widget compact with an internal scroll instead of growing
                        the host page as testimonials pile up.
                      </p>
                    </div>
                    <Switch checked={limitHeight} onCheckedChange={setLimitHeight} />
                  </div>
                  {limitHeight && (
                    <div className="space-y-2">
                      <Label htmlFor="max-height">Max height (px)</Label>
                      <Input
                        id="max-height"
                        type="number"
                        value={maxHeight}
                        onChange={(e) =>
                          setMaxHeight(e.target.value === "" ? "" : Number(e.target.value))
                        }
                      />
                    </div>
                  )}
                </>
              )}
            </>
          )}

          <div className="flex items-center justify-between">
            <Label>Show rating</Label>
            <Switch checked={showRating} onCheckedChange={setShowRating} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Show avatar</Label>
            <Switch checked={showAvatar} onCheckedChange={setShowAvatar} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Show date</Label>
            <Switch checked={showDate} onCheckedChange={setShowDate} />
          </div>

          {type === "wall" && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <Label>Only featured testimonials</Label>
                <Switch checked={onlyFeatured} onCheckedChange={setOnlyFeatured} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-items">Max items</Label>
                <Input
                  id="max-items"
                  type="number"
                  value={maxItems}
                  onChange={(e) =>
                    setMaxItems(e.target.value === "" ? "" : Number(e.target.value))
                  }
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave}>Save changes</Button>
        {saved && <span className="text-sm text-muted-foreground">Saved</span>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Embed snippet</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs">{snippet}</pre>
          <Button
            variant="outline"
            className="mt-3"
            onClick={() => navigator.clipboard.writeText(snippet)}
          >
            Copy snippet
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hosted page link</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            A direct link you can share anywhere — no need to embed it on your own site.
          </p>
          <div className="flex items-center gap-2">
            <Input readOnly value={hostedUrl} className="text-xs" />
            <Button variant="outline" onClick={() => navigator.clipboard.writeText(hostedUrl)}>
              Copy
            </Button>
            <a href={hostedUrl} target="_blank" rel="noreferrer">
              <Button variant="outline">Open</Button>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
