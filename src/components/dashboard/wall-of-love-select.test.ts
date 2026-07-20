import { describe, expect, test } from "vitest";
import { selectWallWidget } from "./wall-of-love-select";
import type { Doc } from "../../../convex/_generated/dataModel";

function fakeWidget(overrides: Partial<Doc<"widgets">>): Doc<"widgets"> {
  return {
    _id: overrides._id ?? ("w1" as Doc<"widgets">["_id"]),
    _creationTime: 0,
    type: "wall",
    isPublished: false,
    ...overrides,
  } as Doc<"widgets">;
}

describe("selectWallWidget", () => {
  test("returns null when there are no widgets", () => {
    expect(selectWallWidget([])).toBeNull();
  });

  test("returns null when only single-testimonial widgets exist", () => {
    const widgets = [fakeWidget({ _id: "a" as Doc<"widgets">["_id"], type: "single" })];
    expect(selectWallWidget(widgets)).toBeNull();
  });

  test("prefers a published wall widget over an unpublished one", () => {
    const draft = fakeWidget({ _id: "a" as Doc<"widgets">["_id"], isPublished: false });
    const live = fakeWidget({ _id: "b" as Doc<"widgets">["_id"], isPublished: true });
    expect(selectWallWidget([draft, live])?._id).toBe("b");
  });

  test("falls back to the first wall widget when none is published", () => {
    const first = fakeWidget({ _id: "a" as Doc<"widgets">["_id"], isPublished: false });
    const second = fakeWidget({ _id: "b" as Doc<"widgets">["_id"], isPublished: false });
    expect(selectWallWidget([first, second])?._id).toBe("a");
  });

  test("ignores single-testimonial widgets when picking among wall widgets", () => {
    const single = fakeWidget({ _id: "a" as Doc<"widgets">["_id"], type: "single" });
    const wall = fakeWidget({ _id: "b" as Doc<"widgets">["_id"], type: "wall" });
    expect(selectWallWidget([single, wall])?._id).toBe("b");
  });
});
