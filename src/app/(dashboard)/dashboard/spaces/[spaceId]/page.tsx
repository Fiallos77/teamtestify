"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Inbox, Clock, CheckCircle2, ArrowRight } from "lucide-react";

const STAT_TONES = {
  primary: "bg-primary/10 text-primary",
  warning: "bg-warning/10 text-warning",
  success: "bg-success/10 text-success",
} as const;

function StatCard({
  icon: Icon,
  label,
  value,
  tone = "primary",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | undefined;
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
          <p className="text-xl font-semibold leading-none">{value ?? "—"}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Hint({ children, href, cta }: { children: React.ReactNode; href: string; cta: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/40 p-4">
      <p className="text-sm">{children}</p>
      <Button size="sm" variant="outline" nativeButton={false} render={<Link href={href} />}>
        {cta}
        <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}

export default function SpaceOverviewPage({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = use(params);
  const id = spaceId as Id<"spaces">;
  const stats = useQuery(api.testimonials.getSpaceStats, { spaceId: id });
  const base = `/dashboard/spaces/${spaceId}`;

  // Contextual next steps — plain suggestions, not a completion checklist.
  const hints: { key: string; text: string; href: string; cta: string }[] = [];
  if (stats) {
    if (stats.total === 0) {
      hints.push({
        key: "share",
        text: "Share your collection link to start gathering testimonials.",
        href: `${base}/share`,
        cta: "Share your link",
      });
    }
    if (stats.pending > 0) {
      hints.push({
        key: "review",
        text: `You have ${stats.pending} submission${stats.pending === 1 ? "" : "s"} waiting for review.`,
        href: `${base}/inbox`,
        cta: "Review inbox",
      });
    }
    if (stats.approved > 0) {
      hints.push({
        key: "widget",
        text: "Show off your approved testimonials with an embeddable widget.",
        href: `${base}/widgets`,
        cta: "Create a widget",
      });
    }
    // Always offer a route into customizing the collection form.
    hints.push({
      key: "customize",
      text: "Customize your collection page — branding, questions, and more.",
      href: `${base}/settings?tab=identity`,
      cta: "Open settings",
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={Inbox} label="Total received" value={stats?.total} />
        <StatCard icon={Clock} label="Pending" value={stats?.pending} tone="warning" />
        <StatCard icon={CheckCircle2} label="Approved" value={stats?.approved} tone="success" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Next steps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {stats === undefined && <p className="text-sm text-muted-foreground">Loading…</p>}
          {hints.map((hint) => (
            <Hint key={hint.key} href={hint.href} cta={hint.cta}>
              {hint.text}
            </Hint>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
