"use client";

import { use, useState } from "react";
import Link from "next/link";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { testimonialLabel } from "@/lib/testimonial-label";

export default function WidgetsPage({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = use(params);
  const id = spaceId as Id<"spaces">;
  const widgets = useQuery(api.widgets.listBySpace, { spaceId: id });
  // The widget picker needs every approved testimonial, so opt out of the
  // paginated default with a high limit and read the items array.
  const approvedTestimonials = useQuery(api.testimonials.listBySpace, {
    spaceId: id,
    status: "approved",
    limit: 1000,
  })?.items;
  const createWidget = useMutation(api.widgets.create);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<"wall" | "single">("wall");
  const [singleTestimonialId, setSingleTestimonialId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate() {
    setSubmitting(true);
    try {
      await createWidget({
        spaceId: id,
        name,
        type,
        singleTestimonialId:
          type === "single" && singleTestimonialId
            ? (singleTestimonialId as Id<"testimonials">)
            : undefined,
        filter: { onlyFeatured: false },
        style: {
          theme: "auto",
          layout: "grid",
          columns: 3,
          showRating: true,
          showAvatar: true,
          autoplaySeconds: undefined,
          // Compact by default — an unbounded wall would otherwise grow the
          // host page indefinitely as testimonials pile up.
          maxHeight: type === "wall" ? 420 : undefined,
        },
      });
      setOpen(false);
      setName("");
      setSingleTestimonialId("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Widgets</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button />}>New widget</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a widget</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="widget-name">Name</Label>
                <Input
                  id="widget-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Homepage wall"
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as "wall" | "single")}>
                  <SelectTrigger>
                    <SelectValue>
                      {(v: string) => (v === "single" ? "Single testimonial" : "Wall of Love")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wall">Wall of Love</SelectItem>
                    <SelectItem value="single">Single testimonial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {type === "single" && (
                <div className="space-y-2">
                  <Label>Testimonial</Label>
                  <Select
                    value={singleTestimonialId}
                    onValueChange={(v) => setSingleTestimonialId(v ?? "")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a testimonial">
                        {(v: string) => testimonialLabel(approvedTestimonials, v)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {approvedTestimonials?.map((t) => (
                        <SelectItem key={t._id} value={t._id}>
                          {t.authorName}
                          {t.textContent ? ` — ${t.textContent.slice(0, 40)}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {approvedTestimonials?.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No approved testimonials yet — approve one from the inbox first.
                    </p>
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                onClick={handleCreate}
                disabled={
                  !name ||
                  submitting ||
                  (type === "single" && !singleTestimonialId)
                }
              >
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {widgets?.map((w) => (
          <Link key={w._id} href={`/dashboard/spaces/${spaceId}/widgets/${w._id}`}>
            <Card className="transition-colors hover:bg-accent">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle>{w.name}</CardTitle>
                <Badge variant={w.isPublished ? "default" : "secondary"}>
                  {w.isPublished ? "Published" : "Draft"}
                </Badge>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground capitalize">
                  {w.type === "wall" ? `Wall · ${w.style.layout}` : "Single testimonial"}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
        {widgets?.length === 0 && (
          <p className="text-muted-foreground">No widgets yet.</p>
        )}
      </div>
    </div>
  );
}
