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
