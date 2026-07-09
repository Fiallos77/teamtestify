"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SpaceSharePanel } from "@/components/dashboard/space-share-panel";

export default function SpaceSharePage({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = use(params);
  const id = spaceId as Id<"spaces">;
  const router = useRouter();
  const space = useQuery(api.spaces.get, { spaceId: id });
  const removeSpace = useMutation(api.spaces.remove);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  if (!space) return <p className="text-muted-foreground">Loading…</p>;

  const publicUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/r/${space.publicSlug}`
      : `/r/${space.publicSlug}`;

  async function handleDelete() {
    setDeleting(true);
    try {
      await removeSpace({ spaceId: id });
      router.push("/dashboard");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <SpaceSharePanel
        spaceName={space.name}
        publicUrl={publicUrl}
        allowText={space.formConfig.allowText}
        allowVideo={space.formConfig.allowVideo}
      />

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger zone</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Delete this space</p>
              <p className="text-sm text-muted-foreground">
                Permanently deletes this space, its collection page, all its testimonials and
                widgets. This can&apos;t be undone.
              </p>
            </div>
            <Dialog
              open={deleteDialogOpen}
              onOpenChange={(open) => {
                setDeleteDialogOpen(open);
                if (!open) setDeleteConfirmText("");
              }}
            >
              <DialogTrigger render={<Button variant="destructive" />}>Delete space</DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete &quot;{space.name}&quot;?</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    This permanently deletes the space, its collection page, every testimonial
                    in it (including uploaded videos), and every widget. Type the space name to
                    confirm.
                  </p>
                  <Input
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder={space.name}
                  />
                </div>
                <DialogFooter>
                  <Button
                    variant="destructive"
                    disabled={deleteConfirmText !== space.name || deleting}
                    onClick={handleDelete}
                  >
                    {deleting ? "Deleting…" : "Delete permanently"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
