"use client";

import { Suspense, use } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../../convex/_generated/dataModel";
import {
  SpaceEditor,
  isSpaceEditorTab,
  type SpaceEditorPayload,
} from "@/components/dashboard/space-editor";

function SpaceSettings({ spaceId }: { spaceId: Id<"spaces"> }) {
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const defaultTab = isSpaceEditorTab(requestedTab) ? requestedTab : "identity";

  const space = useQuery(api.spaces.get, { spaceId });
  const update = useMutation(api.spaces.update);

  async function handleSubmit(payload: SpaceEditorPayload) {
    await update({
      spaceId,
      name: payload.name,
      description: payload.description,
      publicSlug: payload.publicSlug,
      isActive: payload.isActive,
      businessDescription: payload.businessDescription,
      formConfig: payload.formConfig,
      branding: payload.branding,
    });
  }

  return (
    <SpaceEditor
      mode="edit"
      space={space}
      spaceId={spaceId}
      submitLabel="Save changes"
      onSubmit={handleSubmit}
      defaultTab={defaultTab}
    />
  );
}

export default function SpaceSettingsPage({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = use(params);
  // useSearchParams (for the ?tab= deep link) needs a Suspense boundary.
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
      <SpaceSettings spaceId={spaceId as Id<"spaces">} />
    </Suspense>
  );
}
