import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import Stripe from "stripe";
import schema from "./schema";
import { extractStripeWebhookEventArgs } from "./stripeWebhook";

const modules = import.meta.glob("./**/*.ts");

function newTestConvex() {
  return convexTest(schema, modules);
}

const TEST_WEBHOOK_SECRET = "whsec_test_secret_for_vitest_only";

function fakeEvent(id: string, type: string, dataObject: unknown): Stripe.Event {
  return { id, type, data: { object: dataObject } } as unknown as Stripe.Event;
}

describe("extractStripeWebhookEventArgs", () => {
  test("checkout.session.completed pulls organizationId from client_reference_id", () => {
    const args = extractStripeWebhookEventArgs(
      fakeEvent("evt_1", "checkout.session.completed", {
        client_reference_id: "org_abc",
        metadata: { organizationId: "org_abc" },
        customer: "cus_1",
        subscription: "sub_1",
      })
    );
    expect(args).toEqual({
      eventId: "evt_1",
      eventType: "checkout.session.completed",
      organizationId: "org_abc",
      stripeCustomerId: "cus_1",
      stripeSubscriptionId: "sub_1",
    });
  });

  test("checkout.session.completed handles expanded customer/subscription objects", () => {
    const args = extractStripeWebhookEventArgs(
      fakeEvent("evt_2", "checkout.session.completed", {
        client_reference_id: "org_abc",
        customer: { id: "cus_expanded" },
        subscription: { id: "sub_expanded" },
      })
    );
    expect(args.stripeCustomerId).toBe("cus_expanded");
    expect(args.stripeSubscriptionId).toBe("sub_expanded");
  });

  test("customer.subscription.updated pulls status and the first item's current_period_end", () => {
    const args = extractStripeWebhookEventArgs(
      fakeEvent("evt_3", "customer.subscription.updated", {
        id: "sub_1",
        customer: "cus_1",
        status: "active",
        items: { data: [{ current_period_end: 1700000000 }] },
      })
    );
    expect(args).toEqual({
      eventId: "evt_3",
      eventType: "customer.subscription.updated",
      stripeCustomerId: "cus_1",
      stripeSubscriptionId: "sub_1",
      rawStatus: "active",
      currentPeriodEnd: 1700000000,
    });
  });

  test("customer.subscription.deleted pulls customer and subscription ids", () => {
    const args = extractStripeWebhookEventArgs(
      fakeEvent("evt_4", "customer.subscription.deleted", {
        id: "sub_1",
        customer: "cus_1",
        status: "canceled",
        items: { data: [] },
      })
    );
    expect(args.stripeCustomerId).toBe("cus_1");
    expect(args.stripeSubscriptionId).toBe("sub_1");
  });

  test("invoice.payment_failed with next_payment_attempt marks it as not final", () => {
    const args = extractStripeWebhookEventArgs(
      fakeEvent("evt_5", "invoice.payment_failed", {
        customer: "cus_1",
        next_payment_attempt: 1700003600,
        parent: { subscription_details: { subscription: "sub_1" } },
      })
    );
    expect(args.isFinalPaymentFailure).toBe(false);
    expect(args.stripeSubscriptionId).toBe("sub_1");
  });

  test("invoice.payment_failed with no next_payment_attempt is the final attempt", () => {
    const args = extractStripeWebhookEventArgs(
      fakeEvent("evt_6", "invoice.payment_failed", {
        customer: "cus_1",
        next_payment_attempt: null,
        parent: { subscription_details: { subscription: "sub_1" } },
      })
    );
    expect(args.isFinalPaymentFailure).toBe(true);
  });

  test("unrecognized event types still return the base eventId/eventType", () => {
    const args = extractStripeWebhookEventArgs(
      fakeEvent("evt_7", "customer.created", { id: "cus_1" })
    );
    expect(args).toEqual({ eventId: "evt_7", eventType: "customer.created" });
  });
});

describe("POST /stripe/webhook", () => {
  const originalWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const originalSecretKey = process.env.STRIPE_SECRET_KEY;

  beforeEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;
    process.env.STRIPE_SECRET_KEY = "sk_test_not_a_real_key";
  });

  afterEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = originalWebhookSecret;
    process.env.STRIPE_SECRET_KEY = originalSecretKey;
  });

  test(
    "rejects a request with an invalid signature",
    async () => {
      const t = newTestConvex();
      const payload = JSON.stringify({
        id: "evt_bad_sig",
        type: "checkout.session.completed",
        data: { object: {} },
      });

      const res = await t.fetch("/stripe/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "stripe-signature": "t=1,v1=not_a_valid_signature",
        },
        body: payload,
      });

      expect(res.status).toBe(400);
      const stored = await t.run(
        async (ctx) =>
          await ctx.db
            .query("stripeWebhookEvents")
            .withIndex("by_event_id", (q) => q.eq("eventId", "evt_bad_sig"))
            .unique()
      );
      expect(stored).toBeNull();
    },
    15000
  );

  test("accepts a validly-signed event and processes it exactly once", async () => {
    const t = newTestConvex();
    const organizationId = await t.run(
      async (ctx) => await ctx.db.insert("organizations", { name: "Acme", createdAt: Date.now() })
    );
    const payload = JSON.stringify({
      id: "evt_good_sig",
      type: "checkout.session.completed",
      data: {
        object: {
          client_reference_id: organizationId,
          customer: "cus_sig",
          subscription: "sub_sig",
        },
      },
    });
    const stripeForSigning = new Stripe("sk_test_not_a_real_key");
    const signatureHeader = stripeForSigning.webhooks.generateTestHeaderString({
      payload,
      secret: TEST_WEBHOOK_SECRET,
    });

    const res = await t.fetch("/stripe/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json", "stripe-signature": signatureHeader },
      body: payload,
    });
    expect(res.status).toBe(200);

    const subscription = await t.run(
      async (ctx) =>
        await ctx.db
          .query("subscriptions")
          .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
          .unique()
    );
    expect(subscription?.plan).toBe("pro");

    // Redeliver the same event (Stripe retries on timeout) — must not
    // double-process.
    await t.fetch("/stripe/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json", "stripe-signature": signatureHeader },
      body: payload,
    });
    const events = await t.run(
      async (ctx) =>
        await ctx.db
          .query("stripeWebhookEvents")
          .withIndex("by_event_id", (q) => q.eq("eventId", "evt_good_sig"))
          .collect()
    );
    expect(events).toHaveLength(1);
  });

  test("end to end: a real webhook delivery is what getEntitlements sees, not just the subscriptions row", async () => {
    // Closes the loop for task 5 (teamtestify-v2-spec.md Phase 2): proves
    // getEntitlements needs no special-casing for Stripe vs the dev
    // toggle — both just write the same subscriptions row, and this test
    // exercises the real HTTP+signature path, not a direct mutation call.
    const { getEntitlements } = await import("./entitlements");
    const t = newTestConvex();
    const organizationId = await t.run(
      async (ctx) => await ctx.db.insert("organizations", { name: "Acme", createdAt: Date.now() })
    );

    const before = await t.run(async (ctx) => await getEntitlements(ctx, organizationId));
    expect(before.plan).toBe("free");

    const payload = JSON.stringify({
      id: "evt_e2e",
      type: "checkout.session.completed",
      data: {
        object: { client_reference_id: organizationId, customer: "cus_e2e", subscription: "sub_e2e" },
      },
    });
    const stripeForSigning = new Stripe("sk_test_not_a_real_key");
    const signatureHeader = stripeForSigning.webhooks.generateTestHeaderString({
      payload,
      secret: TEST_WEBHOOK_SECRET,
    });
    const res = await t.fetch("/stripe/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json", "stripe-signature": signatureHeader },
      body: payload,
    });
    expect(res.status).toBe(200);

    const after = await t.run(async (ctx) => await getEntitlements(ctx, organizationId));
    expect(after.plan).toBe("pro");
    expect(after.maxSpaces).toBe(5);
  });
});
