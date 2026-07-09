"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { EyeOff, Eye, Link as LinkIcon, MoreHorizontal, Trash2 } from "lucide-react";

type QuickMenuSpace = {
  _id: Id<"spaces">;
  name: string;
  publicSlug: string;
  isActive: boolean;
};

// Quick actions reachable straight from a space's list row/card — mirrors
// testimonial.to's own per-space "..." menu so the founder doesn't have to
// open a space just to grab its link, pause it, or delete it.
export function SpaceQuickMenu({ space }: { space: QuickMenuSpace }) {
  const update = useMutation(api.spaces.update);
  const remove = useMutation(api.spaces.remove);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  function stop(e: { preventDefault: () => void; stopPropagation: () => void }) {
    e.preventDefault();
    e.stopPropagation();
  }

  function copyLink(e: React.MouseEvent) {
    stop(e);
    navigator.clipboard.writeText(`${window.location.origin}/r/${space.publicSlug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function toggleActive(e: React.MouseEvent) {
    stop(e);
    update({ spaceId: space._id, isActive: !space.isActive });
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await remove({ spaceId: space._id });
      setDeleteOpen(false);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="size-6 shrink-0 text-muted-foreground"
              aria-label="Space actions"
              onClick={(e) => e.stopPropagation()}
            />
          }
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={copyLink}>
            <LinkIcon className="size-4" />
            {copied ? "Link copied!" : "Get link"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={toggleActive}>
            {space.isActive ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            {space.isActive ? "Disable" : "Enable"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={(e) => {
              stop(e);
              setDeleteOpen(true);
            }}
          >
            <Trash2 className="size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setConfirmText("");
        }}
      >
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Delete &quot;{space.name}&quot;?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This permanently deletes the space, its collection page, every testimonial in it
              (including uploaded videos), and every widget. Type the space name to confirm.
            </p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={space.name}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <DialogFooter>
            <Button
              variant="destructive"
              disabled={confirmText !== space.name || deleting}
              onClick={handleDelete}
            >
              {deleting ? "Deleting…" : "Delete permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
