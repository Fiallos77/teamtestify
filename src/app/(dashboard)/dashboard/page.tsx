"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SpaceQuickMenu } from "@/components/dashboard/space-quick-menu";
import { formatUsage } from "@/components/dashboard/plan-usage";
import { Layers, Video, Sparkles, MessagesSquare } from "lucide-react";

function MetricCard({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="space-y-2 py-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon className="size-4" />
          </span>
          {label}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const spaces = useQuery(api.spaces.list);
  const usage = useQuery(api.planUsage.getPlanUsage);
  const stats = useQuery(api.testimonials.getOrgStats);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* a) Spaces used / limit */}
        <MetricCard icon={Layers} label="Spaces">
          <p className="text-2xl font-semibold leading-none">
            {usage ? formatUsage(usage.spaces.used, usage.spaces.limit) : "—"}
          </p>
        </MetricCard>

        {/* b) Published video testimonials used / limit */}
        <MetricCard icon={Video} label="Video testimonials">
          <p className="text-2xl font-semibold leading-none">
            {usage
              ? formatUsage(
                  usage.publishedVideoTestimonials.used,
                  usage.publishedVideoTestimonials.limit
                )
              : "—"}
          </p>
        </MetricCard>

        {/* c) Current plan + upgrade CTA for Free */}
        <MetricCard icon={Sparkles} label="Current plan">
          <div className="flex items-center justify-between gap-2">
            <p className="text-2xl font-semibold capitalize leading-none">{usage?.plan ?? "—"}</p>
            {usage?.plan === "free" && (
              <Button
                size="sm"
                nativeButton={false}
                render={<Link href="/dashboard/settings?tab=plan" />}
              >
                Upgrade
              </Button>
            )}
          </div>
        </MetricCard>

        {/* d) Testimonials: pending / approved */}
        <MetricCard icon={MessagesSquare} label="Testimonials">
          <div className="flex gap-6">
            <div>
              <p className="text-2xl font-semibold leading-none">{stats?.pending ?? "—"}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
            <div>
              <p className="text-2xl font-semibold leading-none">{stats?.approved ?? "—"}</p>
              <p className="text-xs text-muted-foreground">Approved</p>
            </div>
          </div>
        </MetricCard>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Spaces</h1>
        <p className="text-sm text-muted-foreground">
          A collection of testimonials for one service, product, or location
        </p>
      </div>

      {spaces === undefined && <p className="text-muted-foreground">Loading…</p>}
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
