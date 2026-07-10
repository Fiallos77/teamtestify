import type { Doc } from "../_generated/dataModel";

export type SubscriptionStatus = Doc<"subscriptions">["status"];

// Collapses Stripe's full subscription status vocabulary down to the 4
// buckets our schema tracks. Anything we don't explicitly recognize maps to
// "incomplete" (never treated as active pro by getEntitlements) rather than
// throwing, so an unfamiliar future Stripe status fails safe/closed instead
// of crashing the webhook handler.
export function mapStripeSubscriptionStatus(raw: string): SubscriptionStatus {
  switch (raw) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
    case "unpaid":
    case "incomplete_expired":
      return "canceled";
    case "incomplete":
    default:
      return "incomplete";
  }
}
