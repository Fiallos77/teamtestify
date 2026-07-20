"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { selectWallWidget } from "@/components/dashboard/wall-of-love-select";
import { buildHostedUrl } from "@/components/dashboard/widget-embed-code";
import { WIDGETS_LOCKED_MESSAGE, isWidgetsLocked } from "@/components/dashboard/widgets-gate";
import { Lock } from "lucide-react";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

function PublicLinkRow({ url }: { url: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input readOnly value={url} className="min-w-0 flex-1" />
      <CopyButton text={url} />
      <Button
        variant="outline"
        nativeButton={false}
        render={<a href={url} target="_blank" rel="noreferrer" />}
      >
        Open
      </Button>
    </div>
  );
}

export default function SpacePagesPage({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = use(params);
  const id = spaceId as Id<"spaces">;
  const space = useQuery(api.spaces.get, { spaceId: id });
  const widgets = useQuery(api.widgets.listBySpace, { spaceId: id });
  const stats = useQuery(api.testimonials.getSpaceStats, { spaceId: id });

  if (!space || widgets === undefined || !stats) {
    return <p className="text-muted-foreground">Loading…</p>;
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const collectionUrl = `${origin}/r/${space.publicSlug}`;
  const wallWidget = selectWallWidget(widgets);
  const wallUrl = wallWidget ? buildHostedUrl(origin, wallWidget._id) : null;
  // A wall page that already exists stays visible regardless of the current
  // approved count (same "once unlocked, stays as is" rule as the Widgets
  // page) — the gate only applies to *creating* a new one from here.
  const widgetsLocked = !wallUrl && isWidgetsLocked(stats.approved);

  return (
    <div className="max-w-2xl">
      <Tabs defaultValue="collection">
        <TabsList>
          <TabsTrigger value="collection">Collection page</TabsTrigger>
          <TabsTrigger value="wall">Wall of Love</TabsTrigger>
        </TabsList>

        <TabsContent value="collection" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Collection page</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Where customers submit a testimonial. Share this link directly, or from the Share
                tab.
              </p>
              <PublicLinkRow url={collectionUrl} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wall" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Wall of Love</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {wallUrl ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Your public Wall of Love page — a hosted showcase of approved testimonials you
                    can link to from anywhere.
                  </p>
                  <PublicLinkRow url={wallUrl} />
                </>
              ) : widgetsLocked ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Lock className="size-4" />
                  </div>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    {WIDGETS_LOCKED_MESSAGE}
                  </p>
                  <Button
                    nativeButton={false}
                    render={<Link href={`/dashboard/spaces/${spaceId}/inbox`} />}
                  >
                    Go to Inbox
                  </Button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    No Wall of Love widget yet. Create one to get a public wall page.
                  </p>
                  <Button
                    nativeButton={false}
                    render={<Link href={`/dashboard/spaces/${spaceId}/widgets`} />}
                  >
                    Create a widget
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
