"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { WidgetAppearanceState } from "@/components/dashboard/widget-appearance";

// The "appearance" fields shared by the standalone widget editor and the
// creation flow's customize step — everything a widget can look like, minus
// its identity (name/type/testimonial/published), which each host owns
// itself. Purely controlled: the host holds the WidgetAppearanceState and
// passes a patch back through onChange, so both places stay in sync with the
// same behavior with no duplicated field logic.
export function WidgetAppearanceForm({
  type,
  state,
  onChange,
}: {
  type: "wall" | "single";
  state: WidgetAppearanceState;
  onChange: (patch: Partial<WidgetAppearanceState>) => void;
}) {
  return (
    <div className="space-y-4">
      <Separator />

      <div className="space-y-2">
        <Label>Theme</Label>
        <Select
          value={state.theme}
          onValueChange={(v) => onChange({ theme: v as WidgetAppearanceState["theme"] })}
        >
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
        <div className="flex flex-wrap items-center gap-2">
          <input
            id="accent-color"
            type="color"
            value={state.accentColor || "#6366f1"}
            onChange={(e) => onChange({ accentColor: e.target.value })}
            className="h-8 w-10 cursor-pointer rounded border"
          />
          <Input
            value={state.accentColor}
            onChange={(e) => onChange({ accentColor: e.target.value })}
            placeholder="#6366f1"
            className="max-w-40"
          />
          {state.accentColor && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange({ accentColor: "" })}
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="background-color">Background color</Label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            id="background-color"
            type="color"
            value={state.backgroundColor || "#ffffff"}
            onChange={(e) => onChange({ backgroundColor: e.target.value })}
            className="h-8 w-10 cursor-pointer rounded border"
          />
          <Input
            value={state.backgroundColor}
            onChange={(e) => onChange({ backgroundColor: e.target.value })}
            placeholder="Default"
            className="max-w-40"
          />
          {state.backgroundColor && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange({ backgroundColor: "" })}
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
            <Select
              value={state.layout}
              onValueChange={(v) =>
                onChange({ layout: v as WidgetAppearanceState["layout"] })
              }
            >
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

          {(state.layout === "grid" ||
            state.layout === "masonry" ||
            (state.layout === "masonry-animated" &&
              state.scrollDirection === "vertical")) && (
            <div className="space-y-2">
              <Label>Columns</Label>
              <Select
                value={String(state.columns || 3)}
                onValueChange={(v) => onChange({ columns: Number(v) })}
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

          {state.layout === "carousel" && (
            <div className="space-y-2">
              <Label htmlFor="autoplay">Autoplay seconds</Label>
              <Input
                id="autoplay"
                type="number"
                value={state.autoplaySeconds}
                onChange={(e) =>
                  onChange({
                    autoplaySeconds: e.target.value === "" ? "" : Number(e.target.value),
                  })
                }
              />
            </div>
          )}

          {state.layout === "masonry-animated" && (
            <>
              <div className="space-y-2">
                <Label>Scroll direction</Label>
                <Select
                  value={state.scrollDirection}
                  onValueChange={(v) =>
                    onChange({
                      scrollDirection: v as WidgetAppearanceState["scrollDirection"],
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue>
                      {(v: string) =>
                        ({ vertical: "Vertical", horizontal: "Horizontal" })[v] ?? v
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vertical">Vertical</SelectItem>
                    <SelectItem value="horizontal">Horizontal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {state.scrollDirection === "horizontal" && (
                <div className="space-y-2">
                  <Label>Rows</Label>
                  <Select
                    value={String(state.rows)}
                    onValueChange={(v) => onChange({ rows: Number(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue>
                        {(v: string) => `${v} row${v === "1" ? "" : "s"}`}
                      </SelectValue>
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
                  value={state.scrollSpeed}
                  onValueChange={(v) =>
                    onChange({ scrollSpeed: v as WidgetAppearanceState["scrollSpeed"] })
                  }
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
                <Switch
                  checked={state.reverseDirection}
                  onCheckedChange={(v) => onChange({ reverseDirection: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Show heart animation</Label>
                <Switch
                  checked={state.showHeartAnimation}
                  onCheckedChange={(v) => onChange({ showHeartAnimation: v })}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Pauses automatically while the visitor hovers, and never grows past the height
                below no matter how many testimonials you have.
              </p>
              <div className="space-y-2">
                <Label htmlFor="max-height-animated">Max height (px)</Label>
                <Input
                  id="max-height-animated"
                  type="number"
                  value={state.maxHeight}
                  onChange={(e) =>
                    onChange({
                      maxHeight: e.target.value === "" ? "" : Number(e.target.value),
                    })
                  }
                />
              </div>
            </>
          )}

          {state.layout !== "carousel" && state.layout !== "masonry-animated" && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Limit height</Label>
                  <p className="text-sm text-muted-foreground">
                    Keeps the widget compact with an internal scroll instead of growing the host
                    page as testimonials pile up.
                  </p>
                </div>
                <Switch
                  checked={state.limitHeight}
                  onCheckedChange={(v) => onChange({ limitHeight: v })}
                />
              </div>
              {state.limitHeight && (
                <div className="space-y-2">
                  <Label htmlFor="max-height">Max height (px)</Label>
                  <Input
                    id="max-height"
                    type="number"
                    value={state.maxHeight}
                    onChange={(e) =>
                      onChange({
                        maxHeight: e.target.value === "" ? "" : Number(e.target.value),
                      })
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
        <Switch checked={state.showRating} onCheckedChange={(v) => onChange({ showRating: v })} />
      </div>
      <div className="flex items-center justify-between">
        <Label>Show avatar</Label>
        <Switch checked={state.showAvatar} onCheckedChange={(v) => onChange({ showAvatar: v })} />
      </div>
      <div className="flex items-center justify-between">
        <Label>Show date</Label>
        <Switch checked={state.showDate} onCheckedChange={(v) => onChange({ showDate: v })} />
      </div>

      {type === "wall" && (
        <>
          <Separator />
          <div className="flex items-center justify-between">
            <Label>Only featured testimonials</Label>
            <Switch
              checked={state.onlyFeatured}
              onCheckedChange={(v) => onChange({ onlyFeatured: v })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="max-items">Max items</Label>
            <Input
              id="max-items"
              type="number"
              value={state.maxItems}
              onChange={(e) =>
                onChange({ maxItems: e.target.value === "" ? "" : Number(e.target.value) })
              }
            />
          </div>
        </>
      )}
    </div>
  );
}
