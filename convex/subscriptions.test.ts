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

async function eventCount(t: ReturnType<typeof newTestConvex>, eventId: string): Promise<number> {
  const rows = await t.run(
    async (ctx) =>
      await ctx.db
        .query("stripeWebhookEvents")
        .withIndex("by_event_id", (q) => q.eq("eventId", eventId))
        .collect()
  );
  return rows.length;
}

async function seedStripeLinkedSubscription(
  t: ReturnType<typeof newTestConvex>,
  organizationId: Id<"organizations">,
  overrides: { stripeCustomerId?: string; stripeSubscriptionId?: string } = {}
) {
  await t.run(
    async (ctx) =>
      await ctx.db.insert("subscriptions", {
        organizationId,
        stripeCustomerId: overrides.stripeCustomerId ?? "cus_test123",
        stripeSubscriptionId: overrides.stripeSubscriptionId ?? "sub_test123",
        plan: "pro",
        status: "active",
      })
  );
}

describe("subscriptions.processStripeWebhookEvent", () => {
  test("checkout.session.completed upserts a pro subscription and restores downgraded content", async () => {
    const t = newTestConvex();
    const organizationId = await seedOrg(t);
    const spaceId = await seedSpace(t, organizationId);
    // Simulate content that was previously downgraded, waiting to be restored.
    const hiddenId = await t.run(
      async (ctx) =>
        await ctx.db.insert("testimonials", {
          spaceId,
          organizationId,
          type: "text",
          status: "pending",
          downgradeHidden: true,
          authorName: "Jane",
          featured: false,
          tags: [],
          source: "form",
          submittedAt: Date.now(),
        })
    );

    await t.mutation(internal.subscriptions.processStripeWebhookEvent, {
      eventId: "evt_checkout_1",
      eventType: "checkout.session.completed",
      organizationId,
      stripeCustomerId: "cus_new",
      stripeSubscriptionId: "sub_new",
    });

    const subscription = await getSubscription(t, organizationId);
    expect(subscription?.plan).toBe("pro");
    expect(subscription?.status).toBe("active");
    expect(subscription?.stripeCustomerId).toBe("cus_new");
    expect(subscription?.stripeSubscriptionId).toBe("sub_new");

    const hidden = await t.run(async (ctx) => await ctx.db.get(hiddenId));
    expect(hidden?.status).toBe("approved");
    expect(hidden?.downgradeHidden).toBe(false);
  });

  test("the same event id is only ever recorded once, even if delivered twice", async () => {
    const t = newTestConvex();
    const organizationId = await seedOrg(t);
    const args = {
      eventId: "evt_dup_1",
      eventType: "checkout.session.completed",
      organizationId,
      stripeCustomerId: "cus_dup",
      stripeSubscriptionId: "sub_dup",
    };

    await t.mutation(internal.subscriptions.processStripeWebhookEvent, args);
    await t.mutation(internal.subscriptions.processStripeWebhookEvent, args);

    expect(await eventCount(t, "evt_dup_1")).toBe(1);
    const subscription = await getSubscription(t, organizationId);
    expect(subscription?.plan).toBe("pro");
  });

  test("customer.subscription.deleted downgrades the org (unit level against the handler)", async () => {
    const t = newTestConvex();
    const organizationId = await seedOrg(t);
    const spaceId = await seedSpace(t, organizationId);
    await seedStripeLinkedSubscription(t, organizationId, {
      stripeCustomerId: "cus_del",
      stripeSubscriptionId: "sub_del",
    });
    for (let i = 0; i < 18; i++) {
      await seedApprovedTestimonial(t, organizationId, spaceId);
    }

    await t.mutation(internal.subscriptions.processStripeWebhookEvent, {
      eventId: "evt_deleted_1",
      eventType: "customer.subscription.deleted",
      stripeCustomerId: "cus_del",
      stripeSubscriptionId: "sub_del",
    });

    const subscription = await getSubscription(t, organizationId);
    expect(subscription?.plan).toBe("free");
    expect(subscription?.status).toBe("canceled");

    const testimonials = await t.run(
      async (ctx) =>
        await ctx.db
          .query("testimonials")
          .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
          .collect()
    );
    expect(testimonials.filter((x) => x.status === "approved")).toHaveLength(15);
  });

  test("invoice.payment_failed downgrades only when it's the final attempt", async () => {
    const t = newTestConvex();
    const organizationId = await seedOrg(t);
    const spaceId = await seedSpace(t, organizationId);
    await seedStripeLinkedSubscription(t, organizationId, {
      stripeCustomerId: "cus_fail",
      stripeSubscriptionId: "sub_fail",
    });
    for (let i = 0; i < 18; i++) {
      await seedApprovedTestimonial(t, organizationId, spaceId);
    }

    await t.mutation(internal.subscriptions.processStripeWebhookEvent, {
      eventId: "evt_fail_retry",
      eventType: "invoice.payment_failed",
      stripeCustomerId: "cus_fail",
      stripeSubscriptionId: "sub_fail",
      isFinalPaymentFailure: false,
    });
    let subscription = await getSubscription(t, organizationId);
    expect(subscription?.status).toBe("active");

    await t.mutation(internal.subscriptions.processStripeWebhookEvent, {
      eventId: "evt_fail_final",
      eventType: "invoice.payment_failed",
      stripeCustomerId: "cus_fail",
      stripeSubscriptionId: "sub_fail",
      isFinalPaymentFailure: true,
    });
    subscription = await getSubscription(t, organizationId);
    expect(subscription?.status).toBe("past_due");
    expect(subscription?.plan).toBe("free");

    const testimonials = await t.run(
      async (ctx) =>
        await ctx.db
          .query("testimonials")
          .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
          .collect()
    );
    expect(testimonials.filter((x) => x.status === "approved")).toHaveLength(15);
  });

  test("customer.subscription.updated recovering to active restores downgraded content", async () => {
    const t = newTestConvex();
    const organizationId = await seedOrg(t);
    const spaceId = await seedSpace(t, organizationId);
    await seedStripeLinkedSubscription(t, organizationId, {
      stripeCustomerId: "cus_recover",
      stripeSubscriptionId: "sub_recover",
    });
    await t.run(async (ctx) => {
      const row = await ctx.db
        .query("subscriptions")
        .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
        .unique();
      await ctx.db.patch(row!._id, { status: "past_due", plan: "free" });
    });
    const hiddenId = await t.run(
      async (ctx) =>
        await ctx.db.insert("testimonials", {
          spaceId,
          organizationId,
          type: "text",
          status: "pending",
          downgradeHidden: true,
          authorName: "Jane",
          featured: false,
          tags: [],
          source: "form",
          submittedAt: Date.now(),
        })
    );

    await t.mutation(internal.subscriptions.processStripeWebhookEvent, {
      eventId: "evt_recovered",
      eventType: "customer.subscription.updated",
      stripeCustomerId: "cus_recover",
      stripeSubscriptionId: "sub_recover",
      rawStatus: "active",
      currentPeriodEnd: 1234567890,
    });

    const subscription = await getSubscription(t, organizationId);
    expect(subscription?.plan).toBe("pro");
    expect(subscription?.status).toBe("active");
    expect(subscription?.currentPeriodEnd).toBe(1234567890);

    const hidden = await t.run(async (ctx) => await ctx.db.get(hiddenId));
    expect(hidden?.status).toBe("approved");
  });

  test("an unrecognized event type is recorded and ignored without error", async () => {
    const t = newTestConvex();

    await expect(
      t.mutation(internal.subscriptions.processStripeWebhookEvent, {
        eventId: "evt_unknown",
        eventType: "some.future.event",
      })
    ).resolves.not.toThrow();

    expect(await eventCount(t, "evt_unknown")).toBe(1);
  });
});
