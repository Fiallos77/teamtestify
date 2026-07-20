"use client";

import { use } from "react";
import type { Id } from "../../../../../../../../convex/_generated/dataModel";
import { WidgetCreationFlow } from "@/components/dashboard/widget-creation-flow";

export default function NewWidgetPage({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = use(params);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Create a widget</h1>
        <p className="text-sm text-muted-foreground">
          Pick a type, then customize how it looks before copying the embed code.
        </p>
      </div>
      <WidgetCreationFlow spaceId={spaceId as Id<"spaces">} />
    </div>
  );
}
