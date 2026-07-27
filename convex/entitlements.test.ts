import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "./schema";
import {
  assertCanCreateSpace,
  assertCanPublish,
  assertCanPublishVideo,
  applyDowngradeToFree,
  applyReUpgradeToPro,
  getEntitlements,
  aiFeatureLimit,
  aiFeatureUsed,
  aiRemaining,
  aiTotalLimit,
  aiTotalUsed,
  assertUnderAiQuota,
  type AiQuota,
  FREE_MAX_SPACES,
  FREE_MAX_PUBLISHED_TESTIMONIALS,
  FREE_MAX_PUBLISHED_VIDEO_TESTIMONIALS,
  FREE_MAX_VIDEO_SECONDS,
  PRO_MAX_SPACES,
  PRO_MAX_VIDEO_SECONDS,
} from "./entitlements";
import type { Doc, Id } from "./_generated/dataModel";

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
  type: "text" | "video",
  reviewedAt: number = Date.now()
): Promise<Id<"testimonials">> {
  return await t.run(
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
        submittedAt: reviewedAt,
        reviewedAt,
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
    expect(entitlements.aiQuota.metering).toBe("per_feature");
    expect(entitlements.aiQuota.requestGensPerMonth).toBe(999);
    expect(entitlements.aiQuota.imageGensPerMonth).toBe(999);
    expect(entitlements.aiQuota.watermark).toBe(true);
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
    expect(entitlements.aiQuota.metering).toBe("combined");
    expect(entitlements.aiQuota.combinedGensPerMonth).toBe(100);
    expect(entitlements.aiQuota.watermark).toBe(false);
    expect(entitlements.maxTeamMembers).toBe(3);
  });
});

describe("assertCanCreateSpace", () => {
  test("passes for a free org's first space", async () => {
    const t = newTestConvex();
    const organizationId = await seedOrg(t);
    await t.run(async (ctx) => await assertCanCreateSpace(ctx, organizationId));
  });

  test("passes for a free org up to 3 spaces", async () => {
    const t = newTestConvex();
    const organizationId = await seedOrg(t);
    for (let i = 0; i < 2; i++) await seedSpace(t, organizationId);

    await t.run(async (ctx) => await assertCanCreateSpace(ctx, organizationId));
  });

  test("throws for a free org's 4th space", async () => {
    const t = newTestConvex();
    const organizationId = await seedOrg(t);
    for (let i = 0; i < 3; i++) await seedSpace(t, organizationId);

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

  test("returns the fetched approved set, for setStatus to reuse in the video check", async () => {
    const t = newTestConvex();
    const organizationId = await seedOrg(t);
    const spaceId = await seedSpace(t, organizationId);
    for (let i = 0; i < 5; i++) {
      await seedApprovedTestimonial(t, organizationId, spaceId, "text");
    }

    const approved = await t.run(async (ctx) => await assertCanPublish(ctx, organizationId));

    expect(approved).toHaveLength(5);
  });

  test("returns null on pro — no bound to check, so nothing is fetched", async () => {
    const t = newTestConvex();
    const organizationId = await seedOrg(t);
    await makePro(t, organizationId);
    const spaceId = await seedSpace(t, organizationId);
    await seedApprovedTestimonial(t, organizationId, spaceId, "text");

    const approved = await t.run(async (ctx) => await assertCanPublish(ctx, organizationId));

    expect(approved).toBeNull();
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

  test("trusts a pre-fetched approved set instead of re-querying the database", async () => {
    const t = newTestConvex();
    const organizationId = await seedOrg(t);
    // The database has zero approved testimonials at all...
    const preFetchedApproved = [
      { type: "video" } as Doc<"testimonials">,
      { type: "video" } as Doc<"testimonials">,
    ];

    // ...but the caller (setStatus, reusing assertCanPublish's result) passes
    // a set that already has 2 videos, so this must throw based on THAT set,
    // proving it didn't fall back to a fresh database scan.
    await expect(
      t.run(
        async (ctx) => await assertCanPublishVideo(ctx, organizationId, preFetchedApproved)
      )
    ).rejects.toThrow();
  });
});

describe("applyDowngradeToFree / applyReUpgradeToPro", () => {
  test("keeps the 15 most recent approved (max 2 video), hides the rest, and restores everything on re-upgrade", async () => {
    const t = newTestConvex();
    const organizationId = await seedOrg(t);
    const spaceId = await seedSpace(t, organizationId);

    // 15 text testimonials, oldest first: reviewedAt 1000..1014
    const textIds: Id<"testimonials">[] = [];
    for (let i = 0; i < 15; i++) {
      textIds.push(await seedApprovedTestimonial(t, organizationId, spaceId, "text", 1000 + i));
    }
    // 5 videos, the most recent items overall: reviewedAt 1015..1019
    const videoIds: Id<"testimonials">[] = [];
    for (let i = 0; i < 5; i++) {
      videoIds.push(await seedApprovedTestimonial(t, organizationId, spaceId, "video", 1015 + i));
    }

    // Expected keep set (most recent 15, capped at 2 video):
    // video[4], video[3] (2 most recent videos), then text[14]..text[2] (13 texts).
    const expectedKept = new Set([
      videoIds[4],
      videoIds[3],
      ...textIds.slice(2, 15).reverse(),
    ]);
    const expectedHidden = new Set([
      videoIds[2],
      videoIds[1],
      videoIds[0],
      textIds[0],
      textIds[1],
    ]);
    expect(expectedKept.size).toBe(15);
    expect(expectedHidden.size).toBe(5);

    await t.run(async (ctx) => await applyDowngradeToFree(ctx, organizationId));

    const afterDowngrade = await t.run(
      async (ctx) =>
        await ctx.db
          .query("testimonials")
          .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
          .collect()
    );
    for (const testimonial of afterDowngrade) {
      if (expectedKept.has(testimonial._id)) {
        expect(testimonial.status).toBe("approved");
        expect(testimonial.downgradeHidden).not.toBe(true);
      } else if (expectedHidden.has(testimonial._id)) {
        expect(testimonial.status).toBe("pending");
        expect(testimonial.downgradeHidden).toBe(true);
      }
    }
    const approvedCount = afterDowngrade.filter((t) => t.status === "approved").length;
    const approvedVideoCount = afterDowngrade.filter(
      (t) => t.status === "approved" && t.type === "video"
    ).length;
    expect(approvedCount).toBe(15);
    expect(approvedVideoCount).toBe(2);

    await t.run(async (ctx) => await applyReUpgradeToPro(ctx, organizationId));

    const afterReUpgrade = await t.run(
      async (ctx) =>
        await ctx.db
          .query("testimonials")
          .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
          .collect()
    );
    expect(afterReUpgrade.every((t) => t.status === "approved")).toBe(true);
    expect(afterReUpgrade.every((t) => !t.downgradeHidden)).toBe(true);
    expect(afterReUpgrade).toHaveLength(20);
  });

  test("never touches a manually-rejected testimonial", async () => {
    const t = newTestConvex();
    const organizationId = await seedOrg(t);
    const spaceId = await seedSpace(t, organizationId);
    for (let i = 0; i < 20; i++) {
      await seedApprovedTestimonial(t, organizationId, spaceId, "text", 1000 + i);
    }
    const rejectedId = await t.run(
      async (ctx) =>
        await ctx.db.insert("testimonials", {
          spaceId,
          organizationId,
          type: "text",
          status: "rejected",
          authorName: "Spammer",
          featured: false,
          tags: [],
          source: "form",
          submittedAt: Date.now(),
          reviewedAt: Date.now(),
        })
    );

    await t.run(async (ctx) => await applyDowngradeToFree(ctx, organizationId));
    expect((await t.run(async (ctx) => await ctx.db.get(rejectedId)))?.status).toBe("rejected");

    await t.run(async (ctx) => await applyReUpgradeToPro(ctx, organizationId));
    expect((await t.run(async (ctx) => await ctx.db.get(rejectedId)))?.status).toBe("rejected");
  });

  test("never touches a testimonial that was always pending", async () => {
    const t = newTestConvex();
    const organizationId = await seedOrg(t);
    const spaceId = await seedSpace(t, organizationId);
    for (let i = 0; i < 20; i++) {
      await seedApprovedTestimonial(t, organizationId, spaceId, "text", 1000 + i);
    }
    const pendingId = await t.run(
      async (ctx) =>
        await ctx.db.insert("testimonials", {
          spaceId,
          organizationId,
          type: "text",
          status: "pending",
          authorName: "New submitter",
          featured: false,
          tags: [],
          source: "form",
          submittedAt: Date.now(),
        })
    );

    await t.run(async (ctx) => await applyDowngradeToFree(ctx, organizationId));
    let pending = await t.run(async (ctx) => await ctx.db.get(pendingId));
    expect(pending?.status).toBe("pending");
    expect(pending?.downgradeHidden).not.toBe(true);

    await t.run(async (ctx) => await applyReUpgradeToPro(ctx, organizationId));
    pending = await t.run(async (ctx) => await ctx.db.get(pendingId));
    expect(pending?.status).toBe("pending");
  });
});

describe("AI quota math", () => {
  const freeQuota: AiQuota = {
    metering: "per_feature",
    requestGensPerMonth: 1,
    imageGensPerMonth: 3,
    combinedGensPerMonth: 0,
    watermark: true,
  };
  const proQuota: AiQuota = {
    metering: "combined",
    requestGensPerMonth: 0,
    imageGensPerMonth: 0,
    combinedGensPerMonth: 100,
    watermark: false,
  };

  test("free meters request and image independently", () => {
    expect(aiFeatureLimit(freeQuota, "request")).toBe(1);
    expect(aiFeatureLimit(freeQuota, "image")).toBe(3);

    // One request used exhausts the request bucket but leaves image untouched.
    const usage = { requestGenCount: 1, imageGenCount: 0 };
    expect(aiRemaining(freeQuota, usage, "request")).toBe(0);
    expect(aiRemaining(freeQuota, usage, "image")).toBe(3);
    expect(() => assertUnderAiQuota(freeQuota, usage, "request")).toThrow();
    expect(() => assertUnderAiQuota(freeQuota, usage, "image")).not.toThrow();
  });

  test("pro draws request and image from one combined pool", () => {
    expect(aiFeatureLimit(proQuota, "request")).toBe(100);
    expect(aiFeatureLimit(proQuota, "image")).toBe(100);

    const usage = { requestGenCount: 60, imageGenCount: 39 };
    expect(aiFeatureUsed(proQuota, usage, "request")).toBe(99);
    expect(aiRemaining(proQuota, usage, "image")).toBe(1);
    expect(() => assertUnderAiQuota(proQuota, usage, "request")).not.toThrow();

    const full = { requestGenCount: 60, imageGenCount: 40 };
    expect(aiRemaining(proQuota, full, "request")).toBe(0);
    expect(() => assertUnderAiQuota(proQuota, full, "image")).toThrow();
  });

  // The dashboard/plan summary card shows a single "AI generations X/Y this
  // month" figure rather than the per-feature breakdown, so it needs a
  // plan-agnostic total: per_feature sums both buckets, combined uses the pool.
  test("aiTotalLimit gives one figure across metering styles", () => {
    expect(aiTotalLimit(freeQuota)).toBe(4); // 1 request + 3 image
    expect(aiTotalLimit(proQuota)).toBe(100);
  });

  test("aiTotalUsed sums request and image counts", () => {
    expect(aiTotalUsed({ requestGenCount: 1, imageGenCount: 3 })).toBe(4);
    expect(aiTotalUsed({ requestGenCount: 0, imageGenCount: 0 })).toBe(0);
  });
});
