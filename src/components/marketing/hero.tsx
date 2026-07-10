import Link from "next/link";
import { Button } from "@/components/ui/button";
import { WallOfLovePreview } from "./wall-of-love-preview";

export function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-4 pt-16 pb-20 sm:px-6 sm:pt-24">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Collect customer testimonials — in minutes, not sprints
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          TeamTestify is the easy way for freelancers, creators, and small teams to collect video
          and text testimonials and publish a Wall of Love on their site. No developer required.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" render={<Link href="/sign-up" />}>
            Start for free
          </Button>
          <Button size="lg" variant="outline" render={<a href="#how-it-works" />}>
            See how it works
          </Button>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          No credit card required · Unlimited collection on every plan
        </p>
      </div>

      <div className="mx-auto mt-14 max-w-4xl">
        <WallOfLovePreview />
      </div>
    </section>
  );
}
