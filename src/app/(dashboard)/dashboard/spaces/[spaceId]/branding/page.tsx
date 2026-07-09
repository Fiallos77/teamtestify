"use client";

import { use, useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandingEditor, type SpaceBranding } from "@/components/dashboard/branding-editor";
import { CollectionPagePreview } from "@/components/dashboard/collection-page-preview";

export default function SpaceBrandingPage({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = use(params);
  const id = spaceId as Id<"spaces">;
  const space = useQuery(api.spaces.get, { spaceId: id });
  const update = useMutation(api.spaces.update);

  const [branding, setBranding] = useState<SpaceBranding>({});
  const [saved, setSaved] = useState(false);
  const logoUrl = useQuery(
    api.spaces.getLogoUrl,
    branding.logoStorageId ? { logoStorageId: branding.logoStorageId } : "skip"
  );

  useEffect(() => {
    if (!space) return;
    setBranding(space.branding);
  }, [space]);

  if (!space) return <p className="text-muted-foreground">Loading…</p>;

  async function handleSave() {
    await update({
      spaceId: id,
      branding: {
        ...space!.branding,
        ...branding,
      },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Branding</CardTitle>
          </CardHeader>
          <CardContent>
            <BrandingEditor branding={branding} onChange={setBranding} />
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button onClick={handleSave}>Save changes</Button>
          {saved && <span className="text-sm text-muted-foreground">Saved</span>}
        </div>
      </div>

      <div className="lg:sticky lg:top-6 lg:self-start">
        <p className="mb-3 text-sm font-medium text-muted-foreground">Live preview</p>
        <CollectionPagePreview
          headline={space.formConfig.headline}
          subheading={space.formConfig.subheading ?? ""}
          logoUrl={logoUrl}
          branding={branding}
          allowText={space.formConfig.allowText}
          allowVideo={space.formConfig.allowVideo}
          collectAuthorEmail={space.formConfig.collectAuthorEmail ?? false}
          collectNameCompanyPhoto={space.formConfig.collectNameCompanyPhoto}
          collectRating={space.formConfig.collectRating}
          questions={space.formConfig.questions}
        />
      </div>
    </div>
  );
}
