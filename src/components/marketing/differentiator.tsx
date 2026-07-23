import { Infinity as InfinityIcon, SlidersHorizontal } from "lucide-react";

export const DIFFERENTIATOR_HEADING = "Works with two simple ideas";

const POINTS = [
  {
    icon: InfinityIcon,
    title: "Unlimited collection, on every plan",
    body: "Never worry about running out of room to gather feedback. Collection is always unlimited — limits only ever apply to what's published.",
  },
  {
    icon: SlidersHorizontal,
    title: "You control what goes live",
    body: "Every submission waits in a moderation queue. You decide what represents your brand before it ever reaches a visitor.",
  },
];

export function Differentiator() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="dark relative overflow-hidden rounded-[24px] bg-background p-8 text-foreground sm:p-12">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-10 size-72 rounded-full opacity-40"
          style={{ background: "radial-gradient(circle, var(--primary), transparent 70%)" }}
        />
        <h2 className="relative text-center font-heading text-2xl font-bold tracking-tight sm:text-3xl">
          {DIFFERENTIATOR_HEADING}
        </h2>
        <div className="relative mt-8 grid gap-3 sm:grid-cols-2">
          {POINTS.map((point) => (
            <div
              key={point.title}
              className="flex gap-3 rounded-xl border border-foreground/10 bg-foreground/[0.06] p-4"
            >
              <point.icon className="size-5 shrink-0 text-success" />
              <div>
                <h3 className="font-medium">{point.title}</h3>
                <p className="mt-1 text-sm text-foreground/70">{point.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
