import Link from "next/link";
import { Button } from "@/components/ui/button";
import { WallOfLovePreview } from "./wall-of-love-preview";

export function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-4 pt-20 pb-24 sm:px-6 sm:pt-32">
      <div className="mx-auto max-w-4xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Collect · Moderate · Embed
        </p>
        <h1 className="mt-6 text-balance text-5xl font-extrabold leading-[1.02] tracking-[-0.035em] sm:text-7xl lg:text-8xl">
          Testimonials in <span className="text-cta">minutes</span>, not sprints
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-balance text-lg text-muted-foreground sm:text-xl">
          The easy way for freelancers, creators, and small teams to collect video and text
          testimonials — and publish a Wall of Love on their site. No developer required.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" variant="cta" nativeButton={false} render={<Link href="/sign-up" />}>
            Start for free
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
        <p className="mt-4 text-sm text-muted-foreground">
          No credit card required · Unlimited collection on every plan
        </p>
      </div>

      <div className="mx-auto mt-16 max-w-4xl sm:mt-20">
        <WallOfLovePreview />
      </div>
    </section>
  );
}
