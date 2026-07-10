// NOT "use node" — Convex only allows httpAction handlers in the default
// (V8 isolate) runtime, never Node.js. Signature verification below uses
// constructEventAsync + createSubtleCryptoProvider specifically because
// they're Web Crypto (crypto.subtle) based, not Node's `crypto` module,
// which isn't available here.
import Stripe from "stripe";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

type WebhookEventArgs = {
  eventId: string;
  eventType: string;
  organizationId?: Id<"organizations">;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  rawStatus?: string;
  currentPeriodEnd?: number;
  isFinalPaymentFailure?: boolean;
};

function idOf(value: string | { id: string } | null | undefined): string | undefined {
  if (!value) return undefined;
  return typeof value === "string" ? value : value.id;
}

// Flattens the Stripe event types we care about into a JSON-safe args
// object for subscriptions.processStripeWebhookEvent (a mutation — it
// can't take a raw Stripe.Event, which isn't a plain Convex value and
// requires DB access this function doesn't have). Pure and side-effect
// free so it's directly unit-testable without any Stripe network/signing.
export function extractStripeWebhookEventArgs(event: Stripe.Event): WebhookEventArgs {
  const base = { eventId: event.id, eventType: event.type };

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const organizationId = (session.client_reference_id ??
        session.metadata?.organizationId) as Id<"organizations"> | undefined;
      return {
        ...base,
        organizationId,
        stripeCustomerId: idOf(session.customer),
        stripeSubscriptionId: idOf(session.subscription),
      };
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      return {
        ...base,
        stripeCustomerId: idOf(subscription.customer),
        stripeSubscriptionId: subscription.id,
        rawStatus: subscription.status,
        currentPeriodEnd: subscription.items?.data[0]?.current_period_end,
      };
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      return {
        ...base,
        stripeCustomerId: idOf(invoice.customer),
        stripeSubscriptionId: idOf(invoice.parent?.subscription_details?.subscription ?? null),
        // Stripe stops scheduling retries once it gives up — that's the
        // standard signal that this was the last attempt, per Stripe's own
        // recommended pattern for detecting a "final" payment failure.
        isFinalPaymentFailure: invoice.next_payment_attempt == null,
      };
    }

    default:
      return base;
  }
}

export const fulfillStripeWebhook = httpAction(async (ctx, request) => {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return new Response("Webhook not configured", { status: 400 });
  }

  const payload = await request.text();
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      webhookSecret,
      undefined,
      Stripe.createSubtleCryptoProvider()
    );
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  await ctx.runMutation(
    internal.subscriptions.processStripeWebhookEvent,
    extractStripeWebhookEventArgs(event)
  );
  return new Response(null, { status: 200 });
});
