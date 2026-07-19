"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatUsage, isAtLimit } from "./plan-usage";

function UsageRow({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number | null;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={cn(
          "text-sm font-medium tabular-nums",
          isAtLimit(used, limit) && "text-warning"
        )}
      >
        {formatUsage(used, limit)}
      </span>
    </div>
  );
}

// Current plan + live usage against the plan's limits. Data comes entirely from
// the server (convex/planUsage.ts → convex/entitlements.ts), so Free and Pro
// render their own limits with no hardcoded values here. Shared by the main
// dashboard and the account settings Plan tab.
export function PlanUsageCard() {
  const usage = useQuery(api.planUsage.getPlanUsage);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Plan &amp; usage</CardTitle>
        {usage && (
          <Badge variant={usage.plan === "pro" ? "default" : "secondary"} className="capitalize">
            {usage.plan} plan
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        {usage === undefined && <p className="text-sm text-muted-foreground">Loading…</p>}
        {usage === null && (
          <p className="text-sm text-muted-foreground">No active organization.</p>
        )}
        {usage && (
          <div className="divide-y">
            <UsageRow label="Spaces" used={usage.spaces.used} limit={usage.spaces.limit} />
            <UsageRow
              label="Published video testimonials"
              used={usage.publishedVideoTestimonials.used}
              limit={usage.publishedVideoTestimonials.limit}
            />
            <UsageRow
              label="AI generations this month"
              used={usage.aiGenerations.used}
              limit={usage.aiGenerations.limit}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
