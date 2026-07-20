"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WIDGETS_LOCKED_MESSAGE, isWidgetsLocked } from "@/components/dashboard/widgets-gate";
import { WidgetTypeSelector } from "@/components/dashboard/widget-type-selector";
import { WallOfLoveFlow } from "@/components/dashboard/wall-of-love-flow";
import { SingleTestimonialFlow } from "@/components/dashboard/single-testimonial-flow";
import { Lock } from "lucide-react";

function WidgetsLocked({ spaceId }: { spaceId: string }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Lock className="size-5" />
      </div>
      <p className="max-w-sm text-muted-foreground">{WIDGETS_LOCKED_MESSAGE}</p>
      <Button nativeButton={false} render={<Link href={`/dashboard/spaces/${spaceId}/inbox`} />}>
        Go to Inbox
      </Button>
    </div>
  );
}

export default function WidgetsPage({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = use(params);
  const id = spaceId as Id<"spaces">;
  const stats = useQuery(api.testimonials.getSpaceStats, { spaceId: id });
  const widgets = useQuery(api.widgets.listBySpace, { spaceId: id });
  const [activeType, setActiveType] = useState<"wall" | "single" | null>(null);

  if (stats === undefined) return <p className="text-muted-foreground">Loading…</p>;
  if (isWidgetsLocked(stats.approved)) return <WidgetsLocked spaceId={spaceId} />;

  if (activeType === "wall") {
    return <WallOfLoveFlow spaceId={id} onExit={() => setActiveType(null)} />;
  }
  if (activeType === "single") {
    return <SingleTestimonialFlow spaceId={id} onExit={() => setActiveType(null)} />;
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="mb-1 text-xl font-semibold">Create a widget</h2>
        <p className="mb-4 text-sm text-muted-foreground">Choose a type to get started.</p>
        <WidgetTypeSelector onSelect={setActiveType} />
      </div>

      {widgets && widgets.length > 0 && (
        <div>
          <h3 className="mb-4 text-lg font-semibold">Your widgets</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {widgets.map((w) => (
              <Link key={w._id} href={`/dashboard/spaces/${spaceId}/widgets/${w._id}`}>
                <Card className="transition-colors hover:bg-accent">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <CardTitle>{w.name}</CardTitle>
                    <Badge variant={w.isPublished ? "default" : "secondary"}>
                      {w.isPublished ? "Published" : "Draft"}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground capitalize">
                      {w.type === "wall" ? `Wall · ${w.style.layout}` : "Single testimonial"}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
