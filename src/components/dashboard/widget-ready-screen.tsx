"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { buildEmbedSnippet, buildHostedUrl } from "@/components/dashboard/widget-embed-code";

// Final "ready" screen shared by both creation flows (Wall of Love and
// Single testimonial) — same embed code generation logic (buildEmbedSnippet/
// buildHostedUrl), same widgets.remove mutation for Cancel. The widget was
// already created to reach this screen, so Cancel deletes it — "discards
// progress" means the draft doesn't linger after an explicit cancel.
export function WidgetReadyScreen({
  title,
  widgetId,
  onDone,
  onCancel,
}: {
  title: string;
  widgetId: Id<"widgets">;
  onDone: () => void;
  onCancel: () => void;
}) {
  const removeWidget = useMutation(api.widgets.remove);
  const [cancelling, setCancelling] = useState(false);

  const appOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const snippet = buildEmbedSnippet(appOrigin, widgetId);
  const hostedUrl = buildHostedUrl(appOrigin, widgetId);

  async function handleCancel() {
    setCancelling(true);
    try {
      await removeWidget({ widgetId });
      onCancel();
    } finally {
      setCancelling(false);
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Copy the code below to embed it on your site.
        </p>

        <div>
          <pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs">{snippet}</pre>
          <Button
            variant="outline"
            className="mt-3"
            onClick={() => navigator.clipboard.writeText(snippet)}
          >
            Copy code
          </Button>
        </div>

        <div>
          <p className="mb-2 text-sm text-muted-foreground">
            Or share the hosted page directly — no embedding required.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Input readOnly value={hostedUrl} className="min-w-0 flex-1 text-xs" />
            <Button variant="outline" onClick={() => navigator.clipboard.writeText(hostedUrl)}>
              Copy
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={onDone}>Done</Button>
          <Button variant="outline" onClick={handleCancel} disabled={cancelling}>
            {cancelling ? "Cancelling…" : "Cancel"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
