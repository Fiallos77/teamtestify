import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "../schema";
import type { Id } from "../_generated/dataModel";
import { selectWidgetTestimonials } from "./widgetPayload";

const modules = import.meta.glob("../**/*.ts");

function newTestConvex() {
  return convexTest(schema, modules);
}

async function seedSpace(t: ReturnType<typeof newTestConvex>) {
  return await t.run(async (ctx) => {
    const organizationId = await ctx.db.insert("organizations", {
      name: "Acme",
      createdAt: Date.now(),
    });
    const spaceId = await ctx.db.insert("spaces", {
      organizationId,
      name: "Space",
      publicSlug: `space-${Math.random().toString(36).slice(2)}`,
      formConfig: {
        headline: "h",
        questions: [],
        collectRating: false,
        collectNameCompanyPhoto: false,
        allowText: true,
        allowVideo: true,
      },
      branding: {},
      isActive: true,
      createdAt: Date.now(),
    });
    return { organizationId, spaceId };
  });
}

async function seedTestimonial(
  t: ReturnType<typeof newTestConvex>,
  organizationId: Id<"organizations">,
  spaceId: Id<"spaces">,
  overrides: {
    status?: "pending" | "approved" | "rejected";
    featured?: boolean;
    rating?: number;
    tags?: string[];
    authorName?: string;
    submittedAt?: number;
    displayOrder?: number;
  } = {}
) {
  return await t.run(
    async (ctx) =>
      await ctx.db.insert("testimonials", {
        spaceId,
        organizationId,
        type: "text",
        status: overrides.status ?? "approved",
        authorName: overrides.authorName ?? "Jane",
        textContent: "Great stuff",
        rating: overrides.rating,
        featured: overrides.featured ?? false,
        tags: overrides.tags ?? [],
        source: "form",
        submittedAt: overrides.submittedAt ?? Date.now(),
        displayOrder: overrides.displayOrder,
      })
  );
}

const emptyFilter = {};

describe("selectWidgetTestimonials", () => {
  test("returns only approved testimonials, as payload shape (not raw docs)", async () => {
    const t = newTestConvex();
    const { organizationId, spaceId } = await seedSpace(t);
    await seedTestimonial(t, organizationId, spaceId, { status: "approved", authorName: "A" });
    await seedTestimonial(t, organizationId, spaceId, { status: "pending", authorName: "B" });
    await seedTestimonial(t, organizationId, spaceId, { status: "rejected", authorName: "C" });

    const result = await t.run(
      async (ctx) => await selectWidgetTestimonials(ctx, spaceId, emptyFilter)
    );

    expect(result).toHaveLength(1);
    expect(result[0].authorName).toBe("A");
    // Payload shape uses "id", not the raw doc's "_id"/"_creationTime".
    expect(result[0]).toHaveProperty("id");
    expect(result[0]).not.toHaveProperty("_id");
  });

  test("applies onlyFeatured", async () => {
    const t = newTestConvex();
    const { organizationId, spaceId } = await seedSpace(t);
    await seedTestimonial(t, organizationId, spaceId, { featured: true, authorName: "Featured" });
    await seedTestimonial(t, organizationId, spaceId, {
      featured: false,
      authorName: "NotFeatured",
    });

    const result = await t.run(
      async (ctx) => await selectWidgetTestimonials(ctx, spaceId, { onlyFeatured: true })
    );

    expect(result.map((x) => x.authorName)).toEqual(["Featured"]);
  });

  test("applies minRating", async () => {
    const t = newTestConvex();
    const { organizationId, spaceId } = await seedSpace(t);
    await seedTestimonial(t, organizationId, spaceId, { rating: 5, authorName: "High" });
    await seedTestimonial(t, organizationId, spaceId, { rating: 2, authorName: "Low" });

    const result = await t.run(
      async (ctx) => await selectWidgetTestimonials(ctx, spaceId, { minRating: 4 })
    );

    expect(result.map((x) => x.authorName)).toEqual(["High"]);
  });

  test("applies includeTags", async () => {
    const t = newTestConvex();
    const { organizationId, spaceId } = await seedSpace(t);
    await seedTestimonial(t, organizationId, spaceId, { tags: ["vip"], authorName: "Tagged" });
    await seedTestimonial(t, organizationId, spaceId, { tags: [], authorName: "Untagged" });

    const result = await t.run(
      async (ctx) => await selectWidgetTestimonials(ctx, spaceId, { includeTags: ["vip"] })
    );

    expect(result.map((x) => x.authorName)).toEqual(["Tagged"]);
  });

  test("sorts by displayOrder and respects maxItems", async () => {
    const t = newTestConvex();
    const { organizationId, spaceId } = await seedSpace(t);
    await seedTestimonial(t, organizationId, spaceId, { authorName: "Second", displayOrder: 2 });
    await seedTestimonial(t, organizationId, spaceId, { authorName: "First", displayOrder: 1 });
    await seedTestimonial(t, organizationId, spaceId, { authorName: "Third", displayOrder: 3 });

    const result = await t.run(
      async (ctx) => await selectWidgetTestimonials(ctx, spaceId, { maxItems: 2 })
    );

    expect(result.map((x) => x.authorName)).toEqual(["First", "Second"]);
  });

  test("defaults to a 50-item cap when maxItems is not set", async () => {
    const t = newTestConvex();
    const { organizationId, spaceId } = await seedSpace(t);
    for (let i = 0; i < 55; i++) {
      await seedTestimonial(t, organizationId, spaceId, { authorName: `T${i}`, displayOrder: i });
    }

    const result = await t.run(
      async (ctx) => await selectWidgetTestimonials(ctx, spaceId, emptyFilter)
    );

    expect(result).toHaveLength(50);
  });
});
