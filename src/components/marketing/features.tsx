import { LayoutGrid, GalleryHorizontal, Video, ShieldCheck, Code2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const FEATURES = [
  {
    icon: LayoutGrid,
    title: "Wall of Love",
    body: "A responsive grid or scrolling masonry wall of your best testimonials, styled to match your brand.",
  },
  {
    icon: GalleryHorizontal,
    title: "Carousel",
    body: "A compact, auto-playing carousel for sidebars, footers, or anywhere a full wall doesn't fit.",
  },
  {
    icon: Video,
    title: "Record videos directly on your phone or computer",
    body: "Customers record straight from their camera — no app, no upload, no extra steps for them.",
  },
  {
    icon: ShieldCheck,
    title: "Moderation queue",
    body: "Every submission lands in your inbox first. Nothing goes live until you approve it.",
  },
  {
    icon: Code2,
    title: "Paste and go",
    body: "One script tag drops a widget onto any site — no iframe wrangling, no CSS to write.",
  },
];

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h2 className="text-center font-heading text-2xl font-bold tracking-tight sm:text-3xl">
        Everything you need to showcase social proof
      </h2>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => (
          <Card key={feature.title}>
            <CardHeader>
              <feature.icon className="size-6 text-primary" />
              <CardTitle className="mt-2 text-base">{feature.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{feature.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
