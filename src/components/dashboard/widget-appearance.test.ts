import { describe, expect, test } from "vitest";
import {
  appearanceStateFromWidget,
  appearanceStateToFilter,
  appearanceStateToStyle,
  defaultAppearanceState,
  type WidgetAppearanceState,
} from "./widget-appearance";
import type { Doc } from "../../../convex/_generated/dataModel";

// Minimal stand-in for a widget doc — appearanceStateFromWidget only reads
// .style and .filter, so the rest of Doc<"widgets"> is irrelevant here.
function fakeWidget(style: Doc<"widgets">["style"], filter: Doc<"widgets">["filter"]) {
  return { style, filter } as Doc<"widgets">;
}

describe("defaultAppearanceState", () => {
  test("wall widgets default to a height-limited grid", () => {
    const state = defaultAppearanceState("wall");
    expect(state.layout).toBe("grid");
    expect(state.columns).toBe(3);
    expect(state.limitHeight).toBe(true);
    expect(state.maxHeight).toBe(420);
  });

  test("single widgets have no height limit by default", () => {
    const state = defaultAppearanceState("single");
    expect(state.limitHeight).toBe(false);
    expect(state.maxHeight).toBe("");
  });
});

describe("appearanceStateToStyle", () => {
  const base = defaultAppearanceState("wall");

  test("grid layout with limitHeight on carries maxHeight", () => {
    const style = appearanceStateToStyle("wall", base);
    expect(style.layout).toBe("grid");
    expect(style.maxHeight).toBe(420);
    expect(style.rows).toBeUndefined();
    expect(style.scrollDirection).toBeUndefined();
  });

  test("carousel never carries a maxHeight even if limitHeight is on", () => {
    const state: WidgetAppearanceState = { ...base, layout: "carousel", limitHeight: true };
    const style = appearanceStateToStyle("wall", state);
    expect(style.maxHeight).toBeUndefined();
  });

  test("masonry-animated always forces a maxHeight, defaulting to 480", () => {
    const state: WidgetAppearanceState = {
      ...base,
      layout: "masonry-animated",
      limitHeight: false,
      maxHeight: "",
    };
    const style = appearanceStateToStyle("wall", state);
    expect(style.maxHeight).toBe(480);
  });

  test("masonry-animated only sends rows when scrolling horizontally", () => {
    const vertical: WidgetAppearanceState = {
      ...base,
      layout: "masonry-animated",
      scrollDirection: "vertical",
      rows: 2,
    };
    expect(appearanceStateToStyle("wall", vertical).rows).toBeUndefined();

    const horizontal: WidgetAppearanceState = {
      ...vertical,
      scrollDirection: "horizontal",
    };
    expect(appearanceStateToStyle("wall", horizontal).rows).toBe(2);
  });

  test("single type never carries a maxHeight regardless of layout", () => {
    const style = appearanceStateToStyle("single", { ...base, limitHeight: true });
    expect(style.maxHeight).toBeUndefined();
  });

  test("empty numeric fields become undefined, not NaN or 0", () => {
    const state: WidgetAppearanceState = { ...base, columns: "", autoplaySeconds: "" };
    const style = appearanceStateToStyle("wall", state);
    expect(style.columns).toBeUndefined();
    expect(style.autoplaySeconds).toBeUndefined();
  });

  test("blank color strings become undefined", () => {
    const style = appearanceStateToStyle("wall", base);
    expect(style.accentColor).toBeUndefined();
    expect(style.backgroundColor).toBeUndefined();
  });
});

describe("appearanceStateToFilter", () => {
  test("carries onlyFeatured and maxItems", () => {
    const state: WidgetAppearanceState = {
      ...defaultAppearanceState("wall"),
      onlyFeatured: true,
      maxItems: 6,
    };
    expect(appearanceStateToFilter(state)).toEqual({ onlyFeatured: true, maxItems: 6 });
  });

  test("empty maxItems becomes undefined", () => {
    const state = defaultAppearanceState("wall");
    expect(appearanceStateToFilter(state)).toEqual({ onlyFeatured: false, maxItems: undefined });
  });
});

describe("appearanceStateFromWidget", () => {
  test("round-trips a wall widget's style and filter back to state", () => {
    const original = defaultAppearanceState("wall");
    const widget = fakeWidget(
      appearanceStateToStyle("wall", original),
      appearanceStateToFilter(original)
    );
    expect(appearanceStateFromWidget(widget)).toEqual(original);
  });

  test("round-trips a masonry-animated horizontal widget", () => {
    const original: WidgetAppearanceState = {
      ...defaultAppearanceState("wall"),
      layout: "masonry-animated",
      scrollDirection: "horizontal",
      rows: 2,
      scrollSpeed: "fast",
      reverseDirection: true,
      showHeartAnimation: true,
      maxHeight: 600,
    };
    const widget = fakeWidget(
      appearanceStateToStyle("wall", original),
      appearanceStateToFilter(original)
    );
    expect(appearanceStateFromWidget(widget)).toEqual(original);
  });

  test("defaults showDate to true when the stored value is absent", () => {
    const widget = fakeWidget(
      {
        theme: "auto",
        layout: "grid",
        showRating: true,
        showAvatar: true,
        // showDate intentionally omitted, as older/just-created widgets have it.
      },
      {}
    );
    expect(appearanceStateFromWidget(widget).showDate).toBe(true);
  });
});
