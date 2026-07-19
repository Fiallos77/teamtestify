"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SpaceEditor, type SpaceEditorPayload } from "@/components/dashboard/space-editor";
import { CheckCircle2 } from "lucide-react";

function CreatedScreen({ spaceId, slug }: { spaceId: Id<"spaces">; slug: string }) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const publicUrl = `${origin}/r/${slug}`;
  const [copied, setCopied] = useState(false);

  return (
    <div className="mx-auto max-w-lg pt-8">
      <Card className="text-center">
        <CardHeader>
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-success/10 text-success">
            <CheckCircle2 className="size-6" />
          </div>
          <CardTitle>Your space is live</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-muted-foreground">
            Share this link with your customers to start collecting testimonials.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <Input readOnly value={publicUrl} className="min-w-0 flex-1" />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(publicUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              render={<a href={publicUrl} target="_blank" rel="noopener noreferrer" />}
            >
              View collection page
            </Button>
            <Button nativeButton={false} render={<Link href={`/dashboard/spaces/${spaceId}`} />}>
              Go to my space
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function NewSpacePage() {
  const createSpace = useMutation(api.spaces.create);
  const [created, setCreated] = useState<{ spaceId: Id<"spaces">; slug: string } | null>(null);

  async function handleSubmit(payload: SpaceEditorPayload) {
    const spaceId = await createSpace({
      name: payload.name,
      description: payload.description,
      publicSlug: payload.publicSlug,
      formConfig: payload.formConfig,
      branding: payload.branding,
    });
    setCreated({ spaceId, slug: payload.publicSlug });
  }

  if (created) {
    return <CreatedScreen spaceId={created.spaceId} slug={created.slug} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Create a space</h1>
        <p className="text-sm text-muted-foreground">
          Set up your collection page. You can fine-tune everything later in Settings.
        </p>
      </div>
      <SpaceEditor mode="create" submitLabel="Create space" onSubmit={handleSubmit} />
    </div>
  );
}
