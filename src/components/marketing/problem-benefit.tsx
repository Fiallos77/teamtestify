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
      <div className="grid gap-6 sm:grid-cols-3">
        {ITEMS.map((item) => (
          <Card key={item.title}>
            <CardHeader>
              <item.icon className="size-6 text-primary" />
              <CardTitle className="mt-2 text-base">{item.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{item.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
