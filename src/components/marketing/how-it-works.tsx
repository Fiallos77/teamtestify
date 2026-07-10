import { Share2, PenLine, Sparkles } from "lucide-react";

const STEPS = [
  {
    icon: Share2,
    title: "1. Share your link",
    body: "Send customers your collection page, or embed the form directly on your own site.",
  },
  {
    icon: PenLine,
    title: "2. They record or write",
    body: "A quick in-browser video or a short text testimonial — no account needed for them.",
  },
  {
    icon: Sparkles,
    title: "3. Review and publish",
    body: "Approve what you want to show, then embed the widget anywhere with one script tag.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-y bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-center text-2xl font-semibold sm:text-3xl">How it works</h2>
        <div className="mt-10 grid gap-8 sm:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.title} className="text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
                <step.icon className="size-5 text-primary" />
              </div>
              <h3 className="mt-4 font-medium">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
