import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// The "15" below is hand-written copy, disconnected from convex/entitlements.ts
// (the actual enforcement) — same tradeoff as plan-matrix.ts. faq.test.ts
// cross-checks it against FREE_MAX_PUBLISHED_TESTIMONIALS to catch drift.
export const FAQS = [
  {
    question: "Do I need a credit card to start?",
    answer:
      "No. The Free plan doesn't require a card — you can collect and publish testimonials without ever entering payment details.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes. Cancel anytime from the billing portal. When you downgrade to Free, your 15 most recent testimonials stay with you — nothing is lost, just limited to what the Free plan allows.",
  },
  {
    question: "Can I invite my team or give clients access?",
    answer:
      "The Free plan supports 1 team member per organization; Pro supports up to 3, so you can bring in teammates or the client you're collecting testimonials for.",
  },
  {
    question: "How long can video testimonials be?",
    answer:
      "Up to 2 minutes on the Free plan and up to 3 minutes on Pro — plenty of room for a genuine story without turning into a full interview.",
  },
  {
    question: 'Can I remove the "Powered by TeamTestify" badge?',
    answer:
      "Yes, on the Pro plan. Free widgets carry a small badge; Pro removes it so the widget reads as fully your own.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h2 className="text-center font-heading text-2xl font-bold tracking-tight sm:text-3xl">
        Frequently asked questions
      </h2>
      <div className="mt-10 space-y-4">
        {FAQS.map((item) => (
          <Card key={item.question}>
            <CardHeader>
              <CardTitle className="text-base">{item.question}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{item.answer}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
