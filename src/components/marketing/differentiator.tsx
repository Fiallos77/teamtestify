import { Infinity as InfinityIcon, SlidersHorizontal } from "lucide-react";

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
      <div className="rounded-2xl border bg-muted/30 p-8 sm:p-10">
        <h2 className="text-center text-2xl font-semibold sm:text-3xl">
          Built around two simple rules
        </h2>
        <div className="mt-8 grid gap-8 sm:grid-cols-2">
          {POINTS.map((point) => (
            <div key={point.title} className="flex gap-4">
              <point.icon className="size-6 shrink-0 text-primary" />
              <div>
                <h3 className="font-medium">{point.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{point.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
