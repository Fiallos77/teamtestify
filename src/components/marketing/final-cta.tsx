import Link from "next/link";
import { Button } from "@/components/ui/button";

export function FinalCta() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="rounded-2xl bg-primary px-6 py-14 text-center text-primary-foreground sm:px-10">
        <h2 className="text-2xl font-semibold sm:text-3xl">
          Start collecting testimonials today
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-primary-foreground/80">
          Free to start, no credit card required. Set up your collection page in a few minutes.
        </p>
        <div className="mt-8">
          <Button
            size="lg"
            variant="cta"
            nativeButton={false}
            render={<Link href="/sign-up" />}
          >
            Start for free
          </Button>
        </div>
      </div>
    </section>
  );
}
