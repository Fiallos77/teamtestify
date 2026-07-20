import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const modules = import.meta.glob("./**/*.ts");

function newTestConvex() {
  return convexTest(schema, modules);
}

async function seedOrgContext(t: ReturnType<typeof newTestConvex>) {
  const authUserId = `user_${Math.random().toString(36).slice(2)}`;
  const { organizationId, spaceId } = await t.run(async (ctx) => {
    const orgId = await ctx.db.insert("organizations", { name: "Acme", createdAt: Date.now() });
    await ctx.db.insert("organizationMembers", {
      organizationId: orgId,
      authUserId,
      role: "owner",
      createdAt: Date.now(),
    });
    await ctx.db.insert("userSettings", { authUserId, activeOrganizationId: orgId });
    const spaceId = await ctx.db.insert("spaces", {
      organizationId: orgId,
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
    return { organizationId: orgId, spaceId };
  });
  return { organizationId, spaceId, asUser: t.withIdentity({ subject: authUserId }) };
}

async function seedTestimonial(
  t: ReturnType<typeof newTestConvex>,
  organizationId: Id<"organizations">,
  spaceId: Id<"spaces">,
  overrides: {
    status?: "pending" | "approved" | "rejected";
    featured?: boolean;
    authorName?: string;
    submittedAt?: number;
    displayOrder?: number;
  } = {}
): Promise<Id<"testimonials">> {
  return await t.run(
    async (ctx) =>
      await ctx.db.insert("testimonials", {
        spaceId,
        organizationId,
        type: "text",
        status: overrides.status ?? "approved",
        authorName: overrides.authorName ?? "Jane",
        textContent: "Great stuff",
        featured: overrides.featured ?? false,
        tags: [],
        source: "form",
        submittedAt: overrides.submittedAt ?? Date.now(),
        displayOrder: overrides.displayOrder,
        reviewedAt: Date.now(),
      })
  );
}

const emptyFilter = {};

describe("widgets.getPreviewPayload", () => {
  test("wall type returns approved testimonials only", async () => {
    const t = newTestConvex();
    const { organizationId, spaceId, asUser } = await seedOrgContext(t);
    await seedTestimonial(t, organizationId, spaceId, { status: "approved", authorName: "A" });
    await seedTestimonial(t, organizationId, spaceId, { status: "pending", authorName: "B" });
    await seedTestimonial(t, organizationId, spaceId, { status: "rejected", authorName: "C" });

    const payload = await asUser.query(api.widgets.getPreviewPayload, {
      spaceId,
      type: "wall",
      filter: emptyFilter,
    });

    expect(payload.type).toBe("wall");
    expect(payload.testimonials).toHaveLength(1);
    expect(payload.testimonials[0].authorName).toBe("A");
  });

  test("wall type applies the onlyFeatured filter", async () => {
    const t = newTestConvex();
    const { organizationId, spaceId, asUser } = await seedOrgContext(t);
    await seedTestimonial(t, organizationId, spaceId, { featured: true, authorName: "Featured" });
    await seedTestimonial(t, organizationId, spaceId, {
      featured: false,
      authorName: "NotFeatured",
    });

    const payload = await asUser.query(api.widgets.getPreviewPayload, {
      spaceId,
      type: "wall",
      filter: { onlyFeatured: true },
    });

    expect(payload.testimonials.map((x) => x.authorName)).toEqual(["Featured"]);
  });

  test("wall type respects maxItems and displayOrder", async () => {
    const t = newTestConvex();
    const { organizationId, spaceId, asUser } = await seedOrgContext(t);
    await seedTestimonial(t, organizationId, spaceId, { authorName: "Second", displayOrder: 2 });
    await seedTestimonial(t, organizationId, spaceId, { authorName: "First", displayOrder: 1 });
    await seedTestimonial(t, organizationId, spaceId, { authorName: "Third", displayOrder: 3 });

    const payload = await asUser.query(api.widgets.getPreviewPayload, {
      spaceId,
      type: "wall",
      filter: { maxItems: 2 },
    });

    expect(payload.testimonials.map((x) => x.authorName)).toEqual(["First", "Second"]);
  });

  test("single type returns the chosen approved testimonial", async () => {
    const t = newTestConvex();
    const { organizationId, spaceId, asUser } = await seedOrgContext(t);
    const testimonialId = await seedTestimonial(t, organizationId, spaceId, {
      authorName: "Chosen",
    });

    const payload = await asUser.query(api.widgets.getPreviewPayload, {
      spaceId,
      type: "single",
      singleTestimonialId: testimonialId,
      filter: emptyFilter,
    });

    expect(payload.testimonials.map((x) => x.authorName)).toEqual(["Chosen"]);
  });

  test("single type with no selection yet returns empty", async () => {
    const t = newTestConvex();
    const { spaceId, asUser } = await seedOrgContext(t);

    const payload = await asUser.query(api.widgets.getPreviewPayload, {
      spaceId,
      type: "single",
      filter: emptyFilter,
    });

    expect(payload.testimonials).toEqual([]);
  });

  test("single type with a not-yet-approved testimonial returns empty", async () => {
    const t = newTestConvex();
    const { organizationId, spaceId, asUser } = await seedOrgContext(t);
    const testimonialId = await seedTestimonial(t, organizationId, spaceId, {
      status: "pending",
    });

    const payload = await asUser.query(api.widgets.getPreviewPayload, {
      spaceId,
      type: "single",
      singleTestimonialId: testimonialId,
      filter: emptyFilter,
    });

    expect(payload.testimonials).toEqual([]);
  });

  test("returns empty for an unauthenticated caller", async () => {
    const t = newTestConvex();
    const { spaceId } = await seedOrgContext(t);

    const payload = await t.query(api.widgets.getPreviewPayload, {
      spaceId,
      type: "wall",
      filter: emptyFilter,
    });

    expect(payload.testimonials).toEqual([]);
  });

  test("rejects a testimonial that belongs to a different space", async () => {
    const t = newTestConvex();
    const { organizationId, spaceId, asUser } = await seedOrgContext(t);
    const { spaceId: otherSpaceId } = await seedOrgContext(t);
    const foreignTestimonialId = await seedTestimonial(t, organizationId, otherSpaceId);

    const payload = await asUser.query(api.widgets.getPreviewPayload, {
      spaceId,
      type: "single",
      singleTestimonialId: foreignTestimonialId,
      filter: emptyFilter,
    });

    expect(payload.testimonials).toEqual([]);
  });
});
