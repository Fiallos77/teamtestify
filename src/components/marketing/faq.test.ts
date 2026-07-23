import { describe, expect, test } from "vitest";
import { FAQS } from "./faq";
import { FREE_MAX_PUBLISHED_TESTIMONIALS } from "../../../convex/entitlements";

describe("marketing FAQ copy", () => {
  test("cancellation FAQ explains what happens to testimonials on downgrade", () => {
    const cancelFaq = FAQS.find((f) => f.question === "Can I cancel anytime?");
    expect(cancelFaq?.answer).toBe(
      `Yes. Cancel anytime from the billing portal. When you downgrade to Free, your ${FREE_MAX_PUBLISHED_TESTIMONIALS} most recent testimonials stay with you — nothing is lost, just limited to what the Free plan allows.`
    );
  });
});
