"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WIDGETS_LOCKED_MESSAGE, isWidgetsLocked } from "@/components/dashboard/widgets-gate";
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

  if (stats === undefined) return <p className="text-muted-foreground">Loading…</p>;
  if (isWidgetsLocked(stats.approved)) return <WidgetsLocked spaceId={spaceId} />;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Widgets</h2>
        <Button nativeButton={false} render={<Link href={`/dashboard/spaces/${spaceId}/widgets/new`} />}>
          New widget
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {widgets?.map((w) => (
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
        {widgets?.length === 0 && (
          <p className="text-muted-foreground">No widgets yet.</p>
        )}
      </div>
    </div>
  );
}
