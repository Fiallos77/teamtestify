import Link from "next/link";
import { Button } from "@/components/ui/button";

export function FinalCta() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div
        className="relative overflow-hidden rounded-[26px] px-6 py-14 text-center text-primary-foreground sm:px-10"
        style={{ background: "linear-gradient(135deg, var(--primary), #E8471F)" }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 -left-10 size-72 rounded-full bg-amber opacity-30"
        />
        <div className="relative">
          <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
            Start collecting testimonials today
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-primary-foreground/90">
            Free to start, no credit card required. Set up your collection page in a few minutes.
          </p>
          <div className="mt-8">
            <Button
              size="lg"
              variant="secondary"
              nativeButton={false}
              render={<Link href="/sign-up" />}
            >
              Start for free →
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
