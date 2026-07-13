"use client";

import { use, useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ErrorWithUpgradeCta } from "@/components/dashboard/upgrade-cta";
import { ImageGenerator } from "@/components/dashboard/image-generator";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

type Status = "pending" | "approved" | "rejected";

function VideoPlayer({ testimonialId }: { testimonialId: Id<"testimonials"> }) {
  const url = useQuery(api.testimonials.getVideoUrl, { testimonialId });
  if (!url) return null;
  return <video src={url} controls className="mt-2 max-h-64 rounded-md" />;
}

function TestimonialCard({
  testimonial,
}: {
  testimonial: {
    _id: Id<"testimonials">;
    type: "text" | "video";
    status: Status;
    authorName: string;
    authorTitle?: string;
    authorCompany?: string;
    rating?: number;
    textContent?: string;
    featured: boolean;
    tags: string[];
  };
}) {
  const setStatus = useMutation(api.testimonials.setStatus);
  const setFeatured = useMutation(api.testimonials.setFeatured);
  const remove = useMutation(api.testimonials.remove);
  const [approveError, setApproveError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const reduceMotion = usePrefersReducedMotion();

  // Play the exit, then run the mutation. Reduced motion → remove at once.
  function animateOut(action: () => void) {
    if (reduceMotion) {
      action();
      return;
    }
    setLeaving(true);
    setTimeout(action, 200);
  }

  async function handleApprove() {
    setApproveError(null);
    try {
      await setStatus({ testimonialId: testimonial._id, status: "approved" });
    } catch (e) {
      setApproveError(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  return (
    <div
      data-leaving={leaving}
      className="grid grid-rows-[1fr] transition-all duration-200 ease-out-strong data-[leaving=true]:grid-rows-[0fr] data-[leaving=true]:opacity-0 data-[leaving=true]:translate-x-2 motion-reduce:transition-none"
    >
      <div className="overflow-hidden">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <p className="font-medium">{testimonial.authorName}</p>
              {(testimonial.authorTitle || testimonial.authorCompany) && (
                <p className="text-sm text-muted-foreground">
                  {[testimonial.authorTitle, testimonial.authorCompany]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
              {testimonial.rating && (
                <p className="text-sm">{"★".repeat(testimonial.rating)}</p>
              )}
            </div>
            <div className="flex gap-2">
              <Badge variant={testimonial.type === "video" ? "default" : "secondary"}>
                {testimonial.type}
              </Badge>
              {testimonial.featured && <Badge variant="outline">Featured</Badge>}
            </div>
          </CardHeader>
          <CardContent>
            {testimonial.textContent && <p>{testimonial.textContent}</p>}
            {testimonial.type === "video" && (
              <VideoPlayer testimonialId={testimonial._id} />
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {testimonial.status === "pending" && (
                <>
                  <Button size="sm" onClick={handleApprove}>
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={leaving}
                    onClick={() =>
                      animateOut(() =>
                        setStatus({ testimonialId: testimonial._id, status: "rejected" })
                      )
                    }
                  >
                    Reject
                  </Button>
                </>
              )}
              {approveError && <ErrorWithUpgradeCta message={approveError} />}
              {testimonial.status === "approved" && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setFeatured({
                        testimonialId: testimonial._id,
                        featured: !testimonial.featured,
                      })
                    }
                  >
                    {testimonial.featured ? "Unfeature" : "Feature"}
                  </Button>
                  <ImageGenerator testimonialId={testimonial._id} />
                </>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                disabled={leaving}
                onClick={() => animateOut(() => remove({ testimonialId: testimonial._id }))}
              >
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const PAGE_SIZE = 10;

export default function InboxPage({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = use(params);
  const [tab, setTab] = useState<Status>("pending");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const result = useQuery(api.testimonials.listBySpace, {
    spaceId: spaceId as Id<"spaces">,
    status: tab,
    page: currentPage,
    limit: PAGE_SIZE,
    sortOrder,
  });

  const total = result?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const end = Math.min(currentPage * PAGE_SIZE, total);

  // After approvals/deletions shrink a tab, snap back if we're past the last
  // page (skip while loading, when total is momentarily 0).
  useEffect(() => {
    if (result !== undefined && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [result, currentPage, totalPages]);

  // Changing tab or sort resets to the first page.
  function handleTabChange(value: string) {
    setTab(value as Status);
    setCurrentPage(1);
  }
  function handleSortChange(value: "asc" | "desc" | null) {
    if (!value) return;
    setSortOrder(value);
    setCurrentPage(1);
  }

  return (
    <Tabs value={tab} onValueChange={handleTabChange}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>
        <Select value={sortOrder} onValueChange={handleSortChange}>
          <SelectTrigger className="w-40">
            <SelectValue>
              {(v: string) => (v === "asc" ? "Oldest first" : "Newest first")}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="desc">Newest first</SelectItem>
            <SelectItem value="asc">Oldest first</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <TabsContent value={tab} className="mt-4 space-y-4">
        {result === undefined && (
          <p className="text-muted-foreground">Loading…</p>
        )}
        {result !== undefined && total === 0 && (
          <p className="text-muted-foreground">Nothing here yet.</p>
        )}
        {result?.items.map((t) => (
          <TestimonialCard key={t._id} testimonial={t} />
        ))}

        {result !== undefined && total > 0 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">
              {start}-{end} of {total}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
