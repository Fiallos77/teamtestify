import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "./schema";
import {
  assertCanCreateSpace,
  assertCanPublish,
  assertCanPublishVideo,
  getEntitlements,
  FREE_MAX_SPACES,
  FREE_MAX_PUBLISHED_TESTIMONIALS,
  FREE_MAX_PUBLISHED_VIDEO_TESTIMONIALS,
  FREE_MAX_VIDEO_SECONDS,
  PRO_MAX_SPACES,
  PRO_MAX_VIDEO_SECONDS,
} from "./entitlements";
import type { Id } from "./_generated/dataModel";

const modules = import.meta.glob("./**/*.ts");

function newTestConvex() {
  return convexTest(schema, modules);
}

async function seedOrg(t: ReturnType<typeof newTestConvex>): Promise<Id<"organizations">> {
  return await t.run(
    async (ctx) => await ctx.db.insert("organizations", { name: "Acme", createdAt: Date.now() })
  );
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

async function seedApprovedTestimonial(
  t: ReturnType<typeof newTestConvex>,
  organizationId: Id<"organizations">,
  spaceId: Id<"spaces">,
  type: "text" | "video"
) {
  await t.run(
    async (ctx) =>
      await ctx.db.insert("testimonials", {
        spaceId,
        organizationId,
        type,
        status: "approved",
        authorName: "Jane",
        featured: false,
        tags: [],
        source: "form",
        submittedAt: Date.now(),
        reviewedAt: Date.now(),
      })
  );
}

describe("getEntitlements", () => {
  test("defaults to free when no subscription row exists", async () => {
    const t = newTestConvex();
    const organizationId = await seedOrg(t);

    const entitlements = await t.run(async (ctx) => await getEntitlements(ctx, organizationId));

    expect(entitlements.plan).toBe("free");
    expect(entitlements.maxSpaces).toBe(FREE_MAX_SPACES);
    expect(entitlements.maxPublishedTestimonials).toBe(FREE_MAX_PUBLISHED_TESTIMONIALS);
    expect(entitlements.maxPublishedVideoTestimonials).toBe(FREE_MAX_PUBLISHED_VIDEO_TESTIMONIALS);
    expect(entitlements.maxVideoSeconds).toBe(FREE_MAX_VIDEO_SECONDS);
    expect(entitlements.badgeRemovable).toBe(false);
    expect(entitlements.aiGenerationsPerMonth).toBe(0);
    expect(entitlements.maxTeamMembers).toBe(1);
  });

  test("defaults to free when the row says plan: free", async () => {
    const t = newTestConvex();
    const organizationId = await seedOrg(t);
    await t.run(
      async (ctx) =>
        await ctx.db.insert("subscriptions", { organizationId, plan: "free", status: "active" })
    );

    const entitlements = await t.run(async (ctx) => await getEntitlements(ctx, organizationId));
    expect(entitlements.plan).toBe("free");
  });

  test("treats a non-active pro row (e.g. canceled) as free", async () => {
    const t = newTestConvex();
    const organizationId = await seedOrg(t);
    await t.run(
      async (ctx) =>
        await ctx.db.insert("subscriptions", { organizationId, plan: "pro", status: "canceled" })
    );

    const entitlements = await t.run(async (ctx) => await getEntitlements(ctx, organizationId));
    expect(entitlements.plan).toBe("free");
  });

  test("returns pro values for an active pro subscription", async () => {
    const t = newTestConvex();
    const organizationId = await seedOrg(t);
    await makePro(t, organizationId);

    const entitlements = await t.run(async (ctx) => await getEntitlements(ctx, organizationId));

    expect(entitlements.plan).toBe("pro");
    expect(entitlements.maxSpaces).toBe(PRO_MAX_SPACES);
    expect(entitlements.maxPublishedTestimonials).toBeNull();
    expect(entitlements.maxPublishedVideoTestimonials).toBeNull();
    expect(entitlements.maxVideoSeconds).toBe(PRO_MAX_VIDEO_SECONDS);
    expect(entitlements.badgeRemovable).toBe(true);
    expect(entitlements.aiGenerationsPerMonth).toBe(100);
    expect(entitlements.maxTeamMembers).toBe(3);
  });
});

describe("assertCanCreateSpace", () => {
  test("passes for a free org's first space", async () => {
    const t = newTestConvex();
    const organizationId = await seedOrg(t);
    await t.run(async (ctx) => await assertCanCreateSpace(ctx, organizationId));
  });

  test("throws for a free org's second space", async () => {
    const t = newTestConvex();
    const organizationId = await seedOrg(t);
    await seedSpace(t, organizationId);

    await expect(
      t.run(async (ctx) => await assertCanCreateSpace(ctx, organizationId))
    ).rejects.toThrow();
  });

  test("passes for a pro org up to 5 spaces", async () => {
    const t = newTestConvex();
    const organizationId = await seedOrg(t);
    await makePro(t, organizationId);
    for (let i = 0; i < 4; i++) await seedSpace(t, organizationId);

    await t.run(async (ctx) => await assertCanCreateSpace(ctx, organizationId));
  });

  test("throws for a pro org's 6th space", async () => {
    const t = newTestConvex();
    const organizationId = await seedOrg(t);
    await makePro(t, organizationId);
    for (let i = 0; i < 5; i++) await seedSpace(t, organizationId);

    await expect(
      t.run(async (ctx) => await assertCanCreateSpace(ctx, organizationId))
    ).rejects.toThrow();
  });
});

describe("assertCanPublish", () => {
  test("passes under the free cap", async () => {
    const t = newTestConvex();
    const organizationId = await seedOrg(t);
    const spaceId = await seedSpace(t, organizationId);
    for (let i = 0; i < 14; i++) {
      await seedApprovedTestimonial(t, organizationId, spaceId, "text");
    }

    await t.run(async (ctx) => await assertCanPublish(ctx, organizationId));
  });

  test("throws at the free cap (15 already approved)", async () => {
    const t = newTestConvex();
    const organizationId = await seedOrg(t);
    const spaceId = await seedSpace(t, organizationId);
    for (let i = 0; i < 15; i++) {
      await seedApprovedTestimonial(t, organizationId, spaceId, "text");
    }

    await expect(
      t.run(async (ctx) => await assertCanPublish(ctx, organizationId))
    ).rejects.toThrow();
  });

  test("never throws on pro regardless of count", async () => {
    const t = newTestConvex();
    const organizationId = await seedOrg(t);
    await makePro(t, organizationId);
    const spaceId = await seedSpace(t, organizationId);
    for (let i = 0; i < 30; i++) {
      await seedApprovedTestimonial(t, organizationId, spaceId, "text");
    }

    await t.run(async (ctx) => await assertCanPublish(ctx, organizationId));
  });
});

describe("assertCanPublishVideo", () => {
  test("passes under the free video cap", async () => {
    const t = newTestConvex();
    const organizationId = await seedOrg(t);
    const spaceId = await seedSpace(t, organizationId);
    await seedApprovedTestimonial(t, organizationId, spaceId, "video");

    await t.run(async (ctx) => await assertCanPublishVideo(ctx, organizationId));
  });

  test("throws at the free video cap (2 already approved)", async () => {
    const t = newTestConvex();
    const organizationId = await seedOrg(t);
    const spaceId = await seedSpace(t, organizationId);
    await seedApprovedTestimonial(t, organizationId, spaceId, "video");
    await seedApprovedTestimonial(t, organizationId, spaceId, "video");

    await expect(
      t.run(async (ctx) => await assertCanPublishVideo(ctx, organizationId))
    ).rejects.toThrow();
  });

  test("never throws on pro regardless of video count", async () => {
    const t = newTestConvex();
    const organizationId = await seedOrg(t);
    await makePro(t, organizationId);
    const spaceId = await seedSpace(t, organizationId);
    for (let i = 0; i < 10; i++) {
      await seedApprovedTestimonial(t, organizationId, spaceId, "video");
    }

    await t.run(async (ctx) => await assertCanPublishVideo(ctx, organizationId));
  });
});
