import Link from "next/link";
import { Button } from "@/components/ui/button";
import { WallOfLovePreview } from "./wall-of-love-preview";

// Full-bleed dark Ink hero with two decorative glow blobs (coral + amber) —
// the flagship application of the brand system per the designer's Brand
// Book ("dark premium con glow coral"). Scoped with `dark` so nested
// components (the outline button) pick up dark-appropriate tokens
// automatically, same trick used for the dashboard sidebar.
export function Hero() {
  return (
    <>
      <section className="dark relative overflow-hidden bg-background text-foreground">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-36 -right-24 size-[520px] rounded-full opacity-[0.5]"
          style={{ background: "radial-gradient(circle, var(--primary), transparent 68%)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-44 -left-28 size-[420px] rounded-full opacity-[0.14]"
          style={{ background: "radial-gradient(circle, var(--amber), transparent 70%)" }}
        />
        <div className="relative mx-auto max-w-6xl px-4 pt-20 pb-24 sm:px-6 sm:pt-28">
          <div className="mx-auto max-w-4xl text-center">
            <span className="inline-block rounded-full border border-amber/30 bg-amber/10 px-4 py-1.5 font-mono text-xs text-amber">
              ✦ Collect · Moderate · Embed
            </span>
            <h1 className="mt-6 text-balance font-heading text-5xl font-extrabold leading-[1.02] tracking-[-0.035em] sm:text-7xl lg:text-8xl">
              Testimonials in <span className="text-primary">minutes</span>, not sprints
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-balance text-lg text-foreground/70 sm:text-xl">
              The easy way for freelancers, creators, and small teams to collect video and text
              testimonials — and publish a Wall of Love on their site. No developer required.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" variant="cta" nativeButton={false} render={<Link href="/sign-up" />}>
                Start for free →
              </Button>
              <Button
                size="lg"
                variant="outline"
                nativeButton={false}
                render={<a href="#how-it-works" />}
              >
                See how it works
              </Button>
            </div>
            <p className="mt-5 text-sm text-foreground/60">
              No credit card required · Unlimited collection on every plan
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
        <WallOfLovePreview />
      </div>
    </>
  );
}
