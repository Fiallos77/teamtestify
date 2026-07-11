import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "./schema";
import { internal } from "./_generated/api";
import { currentMonth } from "./ai";
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

async function usageRow(
  t: ReturnType<typeof newTestConvex>,
  organizationId: Id<"organizations">,
  month: string
) {
  return await t.run(
    async (ctx) =>
      await ctx.db
        .query("aiUsage")
        .withIndex("by_org_and_month", (q) =>
          q.eq("organizationId", organizationId).eq("month", month)
        )
        .unique()
  );
}

describe("currentMonth", () => {
  test("formats a UTC timestamp as YYYY-MM", () => {
    expect(currentMonth(Date.UTC(2026, 6, 11, 12))).toBe("2026-07");
    expect(currentMonth(Date.UTC(2026, 0, 1))).toBe("2026-01");
    expect(currentMonth(Date.UTC(2025, 11, 31, 23, 59))).toBe("2025-12");
  });
});

describe("reserveAiCredit — increment-first, fail closed", () => {
  test("free: 1 request gen allowed, 2nd in the same month rejected via direct mutation", async () => {
    const t = newTestConvex();
    const organizationId = await seedOrg(t);
    const month = "2026-07";

    const first = await t.mutation(internal.ai.reserveAiCredit, {
      organizationId,
      feature: "request",
      month,
    });
    expect(first.remaining).toBe(0);

    await expect(
      t.mutation(internal.ai.reserveAiCredit, { organizationId, feature: "request", month })
    ).rejects.toThrow();

    // The rejected 2nd attempt must not have incremented — exactly one credit spent.
    expect((await usageRow(t, organizationId, month))?.requestGenCount).toBe(1);
  });

  test("free: request and image buckets are independent", async () => {
    const t = newTestConvex();
    const organizationId = await seedOrg(t);
    const month = "2026-07";

    // Exhaust the single request credit.
    await t.mutation(internal.ai.reserveAiCredit, { organizationId, feature: "request", month });
    // Image (3/mo) is still fully available.
    await t.mutation(internal.ai.reserveAiCredit, { organizationId, feature: "image", month });
    await t.mutation(internal.ai.reserveAiCredit, { organizationId, feature: "image", month });
    await t.mutation(internal.ai.reserveAiCredit, { organizationId, feature: "image", month });
    // 4th image over the cap.
    await expect(
      t.mutation(internal.ai.reserveAiCredit, { organizationId, feature: "image", month })
    ).rejects.toThrow();

    const row = await usageRow(t, organizationId, month);
    expect(row?.requestGenCount).toBe(1);
    expect(row?.imageGenCount).toBe(3);
  });

  test("pro: 100 combined gens allowed, 101st rejected", async () => {
    const t = newTestConvex();
    const organizationId = await seedOrg(t);
    await makePro(t, organizationId);
    const month = "2026-07";

    // Mix request + image to prove they share one pool.
    for (let i = 0; i < 50; i++) {
      await t.mutation(internal.ai.reserveAiCredit, { organizationId, feature: "request", month });
    }
    for (let i = 0; i < 50; i++) {
      await t.mutation(internal.ai.reserveAiCredit, { organizationId, feature: "image", month });
    }
    await expect(
      t.mutation(internal.ai.reserveAiCredit, { organizationId, feature: "request", month })
    ).rejects.toThrow();
  });

  test("refund returns a spent credit so a failed generation isn't billed", async () => {
    const t = newTestConvex();
    const organizationId = await seedOrg(t);
    const month = "2026-07";

    // Reserve the single free request credit, then refund it (as the generate
    // action does when the provider call throws).
    const reserved = await t.mutation(internal.ai.reserveAiCredit, {
      organizationId,
      feature: "request",
      month,
    });
    expect(reserved.remaining).toBe(0);
    expect((await usageRow(t, organizationId, month))?.requestGenCount).toBe(1);

    await t.mutation(internal.ai.refundAiCredit, { organizationId, feature: "request", month });
    expect((await usageRow(t, organizationId, month))?.requestGenCount).toBe(0);

    // The credit is genuinely available again.
    const again = await t.mutation(internal.ai.reserveAiCredit, {
      organizationId,
      feature: "request",
      month,
    });
    expect(again.remaining).toBe(0);
  });

  test("refund floors at zero — it can never mint credit", async () => {
    const t = newTestConvex();
    const organizationId = await seedOrg(t);
    const month = "2026-07";

    // Refund with no prior usage row is a no-op; refunding past zero stays at 0.
    await t.mutation(internal.ai.refundAiCredit, { organizationId, feature: "request", month });
    await t.mutation(internal.ai.reserveAiCredit, { organizationId, feature: "image", month });
    await t.mutation(internal.ai.refundAiCredit, { organizationId, feature: "image", month });
    await t.mutation(internal.ai.refundAiCredit, { organizationId, feature: "image", month });

    const row = await usageRow(t, organizationId, month);
    expect(row?.requestGenCount).toBe(0);
    expect(row?.imageGenCount).toBe(0);
  });

  test("month rollover resets the counter", async () => {
    const t = newTestConvex();
    const organizationId = await seedOrg(t);

    await t.mutation(internal.ai.reserveAiCredit, {
      organizationId,
      feature: "request",
      month: "2026-07",
    });
    await expect(
      t.mutation(internal.ai.reserveAiCredit, {
        organizationId,
        feature: "request",
        month: "2026-07",
      })
    ).rejects.toThrow();

    // A new month starts a fresh allowance.
    const next = await t.mutation(internal.ai.reserveAiCredit, {
      organizationId,
      feature: "request",
      month: "2026-08",
    });
    expect(next.remaining).toBe(0);
  });
});
