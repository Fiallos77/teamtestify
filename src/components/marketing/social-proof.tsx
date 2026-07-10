import { Sparkles } from "lucide-react";

// Deliberately not wired to any Convex query: there is no real customer
// testimonial data about TeamTestify itself yet, and this section must
// never show fabricated names/photos presented as real (per the landing
// page brief). Swap this for a query against a real "about us" widget
// once genuine testimonials exist — tracked in docs/pre-launch.md.
export function SocialProof() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
      <Sparkles className="mx-auto size-6 text-primary" />
      <h2 className="mt-4 text-2xl font-semibold sm:text-3xl">We&apos;re just getting started</h2>
      <p className="mt-3 text-muted-foreground">
        TeamTestify is brand new — we don&apos;t have customer stories to share yet, and we&apos;d
        rather tell you that than fake it. Be one of our first customers and your testimonial
        could be featured right here.
      </p>
    </section>
  );
}
