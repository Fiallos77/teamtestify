import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";
import {
  FREE_MAX_SPACES,
  FREE_MAX_PUBLISHED_VIDEO_TESTIMONIALS,
  FREE_AI_REQUEST_GENS_PER_MONTH,
  FREE_AI_IMAGE_GENS_PER_MONTH,
  PRO_MAX_SPACES,
} from "./entitlements";
import { currentMonth } from "./ai";
import type { Id } from "./_generated/dataModel";

const modules = import.meta.glob("./**/*.ts");

function newTestConvex() {
  return convexTest(schema, modules);
}

async function seedOrgContext(t: ReturnType<typeof newTestConvex>) {
  const authUserId = `user_${Math.random().toString(36).slice(2)}`;
  const organizationId = await t.run(async (ctx) => {
    const orgId = await ctx.db.insert("organizations", { name: "Acme", createdAt: Date.now() });
    await ctx.db.insert("organizationMembers", {
      organizationId: orgId,
      authUserId,
      role: "owner",
      createdAt: Date.now(),
    });
    await ctx.db.insert("userSettings", { authUserId, activeOrganizationId: orgId });
    return orgId;
  });
  return { organizationId, asUser: t.withIdentity({ subject: authUserId }) };
}

async function makePro(t: ReturnType<typeof newTestConvex>, organizationId: Id<"organizations">) {
  await t.run(
    async (ctx) =>
      await ctx.db.insert("subscriptions", { organizationId, plan: "pro", status: "active" })
  );
}

async function seedSpace(
  t: ReturnType<typeof newTestConvex>,
  organizationId: Id<"organizations">
): Promise<Id<"spaces">> {
  return await t.run(
    async (ctx) =>
      await ctx.db.insert("spaces", {
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
      })
  );
}

async function seedTestimonial(
  t: ReturnType<typeof newTestConvex>,
  organizationId: Id<"organizations">,
  spaceId: Id<"spaces">,
  type: "text" | "video",
  status: "pending" | "approved"
) {
  await t.run(
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
        reviewedAt: Date.now(),
      })
  );
}

describe("planUsage.getPlanUsage", () => {
  test("returns null when no org is active", async () => {
    const t = newTestConvex();
    expect(await t.query(api.planUsage.getPlanUsage, {})).toBeNull();
  });

  test("free org reports free limits and live counts", async () => {
    const t = newTestConvex();
    const { organizationId, asUser } = await seedOrgContext(t);
    const spaceId = await seedSpace(t, organizationId);
    // 2 approved videos (counts), 1 pending video (does not count as published),
    // 1 approved text (not a video).
    await seedTestimonial(t, organizationId, spaceId, "video", "approved");
    await seedTestimonial(t, organizationId, spaceId, "video", "approved");
    await seedTestimonial(t, organizationId, spaceId, "video", "pending");
    await seedTestimonial(t, organizationId, spaceId, "text", "approved");

    const usage = await asUser.query(api.planUsage.getPlanUsage, {});
    expect(usage).not.toBeNull();
    expect(usage!.plan).toBe("free");
    expect(usage!.spaces).toEqual({ used: 1, limit: FREE_MAX_SPACES });
    expect(usage!.publishedVideoTestimonials).toEqual({
      used: 2,
      limit: FREE_MAX_PUBLISHED_VIDEO_TESTIMONIALS,
    });
    // Free AI total = request + image quotas combined; nothing used yet.
    expect(usage!.aiGenerations.limit).toBe(
      FREE_AI_REQUEST_GENS_PER_MONTH + FREE_AI_IMAGE_GENS_PER_MONTH
    );
    expect(usage!.aiGenerations.used).toBe(0);
  });

  test("counts this month's AI generations across features", async () => {
    const t = newTestConvex();
    const { organizationId, asUser } = await seedOrgContext(t);
    await t.run(
      async (ctx) =>
        await ctx.db.insert("aiUsage", {
          organizationId,
          month: currentMonth(),
          requestGenCount: 1,
          imageGenCount: 2,
        })
    );

    const usage = await asUser.query(api.planUsage.getPlanUsage, {});
    expect(usage!.aiGenerations.used).toBe(3);
  });

  test("pro org reports pro limits with unlimited published video", async () => {
    const t = newTestConvex();
    const { organizationId, asUser } = await seedOrgContext(t);
    await makePro(t, organizationId);

    const usage = await asUser.query(api.planUsage.getPlanUsage, {});
    expect(usage!.plan).toBe("pro");
    expect(usage!.spaces.limit).toBe(PRO_MAX_SPACES);
    expect(usage!.publishedVideoTestimonials.limit).toBeNull();
    expect(usage!.aiGenerations.limit).toBe(100);
  });
});
