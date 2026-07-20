import type { Doc } from "../../../convex/_generated/dataModel";

// The editable "appearance" slice of a widget — everything except its
// identity (name/type/singleTestimonialId/isPublished), which stays owned by
// whichever screen hosts this state (the creation flow's step 1, or the
// standalone editor's own name/type fields). Kept as one plain object with a
// single onChange(patch) setter so the same state shape can drive both the
// widget editor page and the creation flow's customize step without
// duplicating ~20 individual useState calls in each place.
export type WidgetLayout = "grid" | "masonry" | "masonry-animated" | "carousel";

export interface WidgetAppearanceState {
  theme: "light" | "dark" | "auto";
  accentColor: string;
  backgroundColor: string;
  layout: WidgetLayout;
  columns: number | "";
  rows: number;
  autoplaySeconds: number | "";
  showRating: boolean;
  showAvatar: boolean;
  showDate: boolean;
  scrollDirection: "vertical" | "horizontal";
  scrollSpeed: "slow" | "normal" | "fast";
  reverseDirection: boolean;
  showHeartAnimation: boolean;
  onlyFeatured: boolean;
  maxItems: number | "";
  limitHeight: boolean;
  maxHeight: number | "";
}

type WidgetStyleDoc = Doc<"widgets">["style"];
type WidgetFilterDoc = Doc<"widgets">["filter"];

// Same defaults the widget-creation dialog used to hardcode inline, now
// shared with the creation flow's step 2 so a brand-new widget starts from a
// sensible, previewable appearance before the owner touches anything.
export function defaultAppearanceState(type: "wall" | "single"): WidgetAppearanceState {
  return {
    theme: "auto",
    accentColor: "",
    backgroundColor: "",
    layout: "grid",
    columns: 3,
    rows: 1,
    autoplaySeconds: "",
    showRating: true,
    showAvatar: true,
    showDate: true,
    scrollDirection: "vertical",
    scrollSpeed: "normal",
    reverseDirection: false,
    showHeartAnimation: false,
    onlyFeatured: false,
    maxItems: "",
    limitHeight: type === "wall",
    maxHeight: type === "wall" ? 420 : "",
  };
}

// Hydrates editable state from a saved widget — the inverse of
// appearanceStateToStyle/appearanceStateToFilter, used when the standalone
// editor loads an existing widget.
export function appearanceStateFromWidget(widget: Doc<"widgets">): WidgetAppearanceState {
  return {
    theme: widget.style.theme,
    accentColor: widget.style.accentColor ?? "",
    backgroundColor: widget.style.backgroundColor ?? "",
    layout: widget.style.layout,
    columns: widget.style.columns ?? 3,
    rows: widget.style.rows ?? 1,
    autoplaySeconds: widget.style.autoplaySeconds ?? "",
    showRating: widget.style.showRating,
    showAvatar: widget.style.showAvatar,
    showDate: widget.style.showDate !== false,
    scrollDirection: widget.style.scrollDirection ?? "vertical",
    scrollSpeed: widget.style.scrollSpeed ?? "normal",
    reverseDirection: widget.style.reverseDirection ?? false,
    showHeartAnimation: widget.style.showHeartAnimation ?? false,
    onlyFeatured: widget.filter.onlyFeatured ?? false,
    maxItems: widget.filter.maxItems ?? "",
    limitHeight: widget.style.maxHeight !== undefined,
    maxHeight: widget.style.maxHeight ?? (widget.style.layout === "masonry-animated" ? 480 : 420),
  };
}

// Turns editable state into the style patch sent to widgets.create/update.
// Masonry-animated-only fields (rows/scrollDirection/scrollSpeed/
// reverseDirection/showHeartAnimation) are only persisted for that layout;
// maxHeight has three cases: always-on (capped) for masonry-animated,
// opt-in via limitHeight for the other bounded layouts, and never for
// carousel (which is never scroll-limited).
export function appearanceStateToStyle(
  type: "wall" | "single",
  state: WidgetAppearanceState
): WidgetStyleDoc {
  return {
    theme: state.theme,
    accentColor: state.accentColor || undefined,
    backgroundColor: state.backgroundColor || undefined,
    layout: state.layout,
    columns: state.columns === "" ? undefined : Number(state.columns),
    rows:
      state.layout === "masonry-animated" && state.scrollDirection === "horizontal"
        ? state.rows
        : undefined,
    autoplaySeconds: state.autoplaySeconds === "" ? undefined : Number(state.autoplaySeconds),
    showRating: state.showRating,
    showAvatar: state.showAvatar,
    showDate: state.showDate,
    scrollDirection: state.layout === "masonry-animated" ? state.scrollDirection : undefined,
    scrollSpeed: state.layout === "masonry-animated" ? state.scrollSpeed : undefined,
    reverseDirection: state.layout === "masonry-animated" ? state.reverseDirection : undefined,
    showHeartAnimation:
      state.layout === "masonry-animated" ? state.showHeartAnimation : undefined,
    maxHeight:
      type === "wall" && state.layout === "masonry-animated"
        ? Number(state.maxHeight || 480)
        : type === "wall" &&
            state.layout !== "carousel" &&
            state.limitHeight &&
            state.maxHeight !== ""
          ? Number(state.maxHeight)
          : undefined,
  };
}

export function appearanceStateToFilter(state: WidgetAppearanceState): WidgetFilterDoc {
  return {
    onlyFeatured: state.onlyFeatured,
    maxItems: state.maxItems === "" ? undefined : Number(state.maxItems),
  };
}
