import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "./schema";
import { internal } from "./_generated/api";
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

async function getSubscription(t: ReturnType<typeof newTestConvex>, organizationId: Id<"organizations">) {
  return await t.run(
    async (ctx) =>
      await ctx.db
        .query("subscriptions")
        .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
        .unique()
  );
}

describe("subscriptions.setPlanForTesting", () => {
  test("creates a subscription row when none exists", async () => {
    const t = newTestConvex();
    const organizationId = await seedOrg(t);

    await t.mutation(internal.subscriptions.setPlanForTesting, {
      organizationId,
      plan: "pro",
    });

    const subscription = await getSubscription(t, organizationId);
    expect(subscription?.plan).toBe("pro");
    expect(subscription?.status).toBe("active");
  });

  test("toggling again updates the same row instead of creating a second one", async () => {
    const t = newTestConvex();
    const organizationId = await seedOrg(t);

    await t.mutation(internal.subscriptions.setPlanForTesting, { organizationId, plan: "pro" });
    await t.mutation(internal.subscriptions.setPlanForTesting, { organizationId, plan: "free" });

    const rows = await t.run(
      async (ctx) =>
        await ctx.db
          .query("subscriptions")
          .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
          .collect()
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].plan).toBe("free");
  });

  test("toggles back and forth between free and pro", async () => {
    const t = newTestConvex();
    const organizationId = await seedOrg(t);

    await t.mutation(internal.subscriptions.setPlanForTesting, { organizationId, plan: "pro" });
    expect((await getSubscription(t, organizationId))?.plan).toBe("pro");

    await t.mutation(internal.subscriptions.setPlanForTesting, { organizationId, plan: "free" });
    expect((await getSubscription(t, organizationId))?.plan).toBe("free");

    await t.mutation(internal.subscriptions.setPlanForTesting, { organizationId, plan: "pro" });
    expect((await getSubscription(t, organizationId))?.plan).toBe("pro");
  });
});

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
  spaceId: Id<"spaces">
): Promise<Id<"testimonials">> {
  return await t.run(
    async (ctx) =>
      await ctx.db.insert("testimonials", {
        spaceId,
        organizationId,
        type: "text",
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

describe("subscriptions.setPlanForTesting wires the downgrade/re-upgrade round trip", () => {
  test("toggling to free unpublishes over-limit testimonials; toggling back to pro restores them", async () => {
    const t = newTestConvex();
    const organizationId = await seedOrg(t);
    const spaceId = await seedSpace(t, organizationId);
    const ids: Id<"testimonials">[] = [];
    for (let i = 0; i < 18; i++) {
      ids.push(await seedApprovedTestimonial(t, organizationId, spaceId));
    }

    await t.mutation(internal.subscriptions.setPlanForTesting, { organizationId, plan: "free" });

    const afterDowngrade = await Promise.all(
      ids.map((id) => t.run(async (ctx) => await ctx.db.get(id)))
    );
    expect(afterDowngrade.filter((t) => t?.status === "approved")).toHaveLength(15);
    expect(afterDowngrade.filter((t) => t?.downgradeHidden === true)).toHaveLength(3);

    await t.mutation(internal.subscriptions.setPlanForTesting, { organizationId, plan: "pro" });

    const afterReUpgrade = await Promise.all(
      ids.map((id) => t.run(async (ctx) => await ctx.db.get(id)))
    );
    expect(afterReUpgrade.every((t) => t?.status === "approved")).toBe(true);
    expect(afterReUpgrade.every((t) => !t?.downgradeHidden)).toBe(true);
  });
});
