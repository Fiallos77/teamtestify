import { Mail, Video, Code2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ITEMS = [
  {
    icon: Mail,
    title: "Asking for testimonials is awkward",
    body: "Stop chasing clients over email. Send one link — they share their story in about two minutes, on their own time.",
  },
  {
    icon: Video,
    title: "Video feels out of reach",
    body: "No app to download and nothing for you to build. Customers record right in their browser, from their phone or laptop.",
  },
  {
    icon: Code2,
    title: "Displaying them takes a developer",
    body: "Paste one script tag and get a polished, on-brand Wall of Love or carousel — no database, no design work.",
  },
];

export function ProblemBenefit() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {ITEMS.map((item, i) => {
          const isHighlight = i === ITEMS.length - 1;
          return (
            <Card
              key={item.title}
              className={isHighlight ? "dark bg-background text-foreground" : undefined}
            >
              <CardHeader>
                <span
                  className={`flex size-11 items-center justify-center rounded-xl ${isHighlight ? "bg-amber/15" : "bg-accent"}`}
                >
                  <item.icon className={`size-5 ${isHighlight ? "text-amber" : "text-primary"}`} />
                </span>
                <CardTitle
                  className={`mt-3 text-base font-heading ${isHighlight ? "text-amber" : ""}`}
                >
                  {item.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-sm ${isHighlight ? "text-foreground/70" : "text-muted-foreground"}`}>
                  {item.body}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
