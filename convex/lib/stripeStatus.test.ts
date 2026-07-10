import { describe, expect, test } from "vitest";
import { mapStripeSubscriptionStatus } from "./stripeStatus";

describe("mapStripeSubscriptionStatus", () => {
  test.each([
    ["active", "active"],
    ["trialing", "active"],
    ["past_due", "past_due"],
    ["canceled", "canceled"],
    ["unpaid", "canceled"],
    ["incomplete_expired", "canceled"],
    ["incomplete", "incomplete"],
    ["paused", "incomplete"],
    ["some_future_stripe_status", "incomplete"],
  ] as const)("maps Stripe status %s -> %s", (raw, expected) => {
    expect(mapStripeSubscriptionStatus(raw)).toBe(expected);
  });
});
