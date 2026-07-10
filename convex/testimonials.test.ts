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

async function makePro(t: ReturnType<typeof newTestConvex>, organizationId: Id<"organizations">) {
  await t.run(
    async (ctx) =>
      await ctx.db.insert("subscriptions", { organizationId, plan: "pro", status: "active" })
  );
}

async function seedPendingTestimonial(
  t: ReturnType<typeof newTestConvex>,
  organizationId: Id<"organizations">,
  spaceId: Id<"spaces">,
  type: "text" | "video",
  status: "pending" | "approved" = "pending"
): Promise<Id<"testimonials">> {
  return await t.run(
    async (ctx) =>
      await ctx.db.insert("testimonials", {
        spaceId,
        organizationId,
        type,
        status,
        authorName: "Jane",
        featured: false,
        tags: [],
        source: "form",
        submittedAt: Date.now(),
        reviewedAt: status === "approved" ? Date.now() : undefined,
      })
  );
}

describe("testimonials.setStatus entitlement enforcement", () => {
  test("free org can approve up to 15 testimonials", async () => {
    const t = newTestConvex();
    const { organizationId, spaceId, asUser } = await seedOrgContext(t);
    for (let i = 0; i < 14; i++) {
      await seedPendingTestimonial(t, organizationId, spaceId, "text", "approved");
    }
    const testimonialId = await seedPendingTestimonial(t, organizationId, spaceId, "text");

    await asUser.mutation(api.testimonials.setStatus, { testimonialId, status: "approved" });

    const testimonial = await t.run(async (ctx) => await ctx.db.get(testimonialId));
    expect(testimonial?.status).toBe("approved");
  });

  test("free org cannot approve a 16th testimonial", async () => {
    const t = newTestConvex();
    const { organizationId, spaceId, asUser } = await seedOrgContext(t);
    for (let i = 0; i < 15; i++) {
      await seedPendingTestimonial(t, organizationId, spaceId, "text", "approved");
    }
    const testimonialId = await seedPendingTestimonial(t, organizationId, spaceId, "text");

    await expect(
      asUser.mutation(api.testimonials.setStatus, { testimonialId, status: "approved" })
    ).rejects.toThrow();

    const testimonial = await t.run(async (ctx) => await ctx.db.get(testimonialId));
    expect(testimonial?.status).toBe("pending");
  });

  test("free org cannot approve a 3rd video testimonial", async () => {
    const t = newTestConvex();
    const { organizationId, spaceId, asUser } = await seedOrgContext(t);
    await seedPendingTestimonial(t, organizationId, spaceId, "video", "approved");
    await seedPendingTestimonial(t, organizationId, spaceId, "video", "approved");
    const testimonialId = await seedPendingTestimonial(t, organizationId, spaceId, "video");

    await expect(
      asUser.mutation(api.testimonials.setStatus, { testimonialId, status: "approved" })
    ).rejects.toThrow();
  });

  test("pro org can approve past the free limits", async () => {
    const t = newTestConvex();
    const { organizationId, spaceId, asUser } = await seedOrgContext(t);
    await makePro(t, organizationId);
    for (let i = 0; i < 20; i++) {
      await seedPendingTestimonial(t, organizationId, spaceId, "video", "approved");
    }
    const testimonialId = await seedPendingTestimonial(t, organizationId, spaceId, "video");

    await asUser.mutation(api.testimonials.setStatus, { testimonialId, status: "approved" });

    const testimonial = await t.run(async (ctx) => await ctx.db.get(testimonialId));
    expect(testimonial?.status).toBe("approved");
  });

  test("re-approving an already-approved testimonial is a no-op, not a new count", async () => {
    const t = newTestConvex();
    const { organizationId, spaceId, asUser } = await seedOrgContext(t);
    for (let i = 0; i < 14; i++) {
      await seedPendingTestimonial(t, organizationId, spaceId, "text", "approved");
    }
    const testimonialId = await seedPendingTestimonial(t, organizationId, spaceId, "text", "approved");

    // Already one of the 15 approved — re-approving must not count itself twice.
    await asUser.mutation(api.testimonials.setStatus, { testimonialId, status: "approved" });

    const testimonial = await t.run(async (ctx) => await ctx.db.get(testimonialId));
    expect(testimonial?.status).toBe("approved");
  });

  test("rejecting is never blocked by entitlements", async () => {
    const t = newTestConvex();
    const { organizationId, spaceId, asUser } = await seedOrgContext(t);
    for (let i = 0; i < 15; i++) {
      await seedPendingTestimonial(t, organizationId, spaceId, "text", "approved");
    }
    const testimonialId = await seedPendingTestimonial(t, organizationId, spaceId, "text");

    await asUser.mutation(api.testimonials.setStatus, { testimonialId, status: "rejected" });

    const testimonial = await t.run(async (ctx) => await ctx.db.get(testimonialId));
    expect(testimonial?.status).toBe("rejected");
  });
});
