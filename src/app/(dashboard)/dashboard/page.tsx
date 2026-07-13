"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SpaceQuickMenu } from "@/components/dashboard/space-quick-menu";
import { Layers, Clock, CheckCircle2, Video } from "lucide-react";

// No billing/plans exist yet — these limits are illustrative placeholders
// for the UI, not enforced anywhere. Swap for real plan data once pricing
// tiers are built.
const PLACEHOLDER_LIMITS = { spaces: 5, videoTestimonials: 20 };

const STAT_TONES = {
  primary: "bg-primary/10 text-primary",
  warning: "bg-warning/10 text-warning",
  success: "bg-success/10 text-success",
} as const;

function StatCard({
  icon: Icon,
  label,
  value,
  limit,
  tone = "primary",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | undefined;
  limit?: number;
  tone?: keyof typeof STAT_TONES;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <div
          className={`flex size-9 shrink-0 items-center justify-center rounded-full ${STAT_TONES[tone]}`}
        >
          <Icon className="size-4" />
        </div>
        <div>
          <p className="text-xl font-semibold leading-none">
            {value ?? "—"}
            {limit !== undefined && (
              <span className="text-sm font-normal text-muted-foreground"> / {limit}</span>
            )}
          </p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const spaces = useQuery(api.spaces.list);
  const stats = useQuery(api.testimonials.getOrgStats);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={Layers}
          label="Spaces"
          value={spaces?.length}
          limit={PLACEHOLDER_LIMITS.spaces}
        />
        <StatCard icon={Clock} label="Pending review" value={stats?.pending} tone="warning" />
        <StatCard icon={CheckCircle2} label="Approved" value={stats?.approved} tone="success" />
        <StatCard
          icon={Video}
          label="Video testimonials"
          value={stats?.videoCount}
          limit={PLACEHOLDER_LIMITS.videoTestimonials}
        />
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Spaces</h1>
      </div>

      {spaces === undefined && (
        <p className="text-muted-foreground">Loading…</p>
      )}
      {spaces?.length === 0 && (
        <p className="text-muted-foreground">
          No spaces yet. Create one to get your first collection link.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {spaces?.map((space) => (
          <div key={space._id} className="relative">
            <Link href={`/dashboard/spaces/${space._id}`}>
              <Card className="transition-colors hover:bg-accent">
                <CardHeader>
                  <div className="flex items-center gap-2 pr-8">
                    <CardTitle>{space.name}</CardTitle>
                    {!space.isActive && <Badge variant="secondary">Paused</Badge>}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">/r/{space.publicSlug}</p>
                  {space.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{space.description}</p>
                  )}
                </CardContent>
              </Card>
            </Link>
            <div className="absolute right-3 top-3">
              <SpaceQuickMenu space={space} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
