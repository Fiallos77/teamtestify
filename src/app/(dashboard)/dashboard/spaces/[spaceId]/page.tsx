"use client";

import { use, useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ErrorWithUpgradeCta } from "@/components/dashboard/upgrade-cta";
import { ImageGenerator } from "@/components/dashboard/image-generator";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

type Status = "pending" | "approved" | "rejected";

function VideoPlayer({ testimonialId }: { testimonialId: Id<"testimonials"> }) {
  const url = useQuery(api.testimonials.getVideoUrl, { testimonialId });
  if (!url) return null;
  return <video src={url} controls className="mt-2 max-h-64 rounded-2xl" />;
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

  const initial = testimonial.authorName.trim().charAt(0).toUpperCase();
  const statusStyle: Record<Status, string> = {
    pending: "bg-amber/15 text-amber-text",
    approved: "bg-success/15 text-success-text",
    rejected: "bg-destructive/12 text-destructive",
  };

  return (
    <div
      data-leaving={leaving}
      className="grid grid-rows-[1fr] transition-all duration-200 ease-out-strong data-[leaving=true]:grid-rows-[0fr] data-[leaving=true]:opacity-0 data-[leaving=true]:translate-x-2 motion-reduce:transition-none"
    >
      <div className="overflow-hidden">
        <Card className="p-5">
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 px-0">
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--primary),var(--amber))] font-heading text-sm font-bold text-white">
                {initial}
              </span>
              <div>
                <p className="flex items-center gap-2 font-medium">
                  {testimonial.authorName}
                  {testimonial.featured && (
                    <span className="rounded-full bg-amber/15 px-2 py-0.5 text-xs font-semibold text-amber-text">
                      ★ Featured
                    </span>
                  )}
                </p>
                {(testimonial.authorTitle || testimonial.authorCompany) && (
                  <p className="text-sm text-muted-foreground">
                    {[testimonial.authorTitle, testimonial.authorCompany]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              {testimonial.rating && (
                <span className="text-sm tracking-tight text-amber">
                  {"★".repeat(testimonial.rating)}
                  <span className="text-border">{"★".repeat(5 - testimonial.rating)}</span>
                </span>
              )}
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusStyle[testimonial.status]}`}
              >
                {testimonial.status}
              </span>
            </div>
          </CardHeader>
          <CardContent className="px-0">
            {testimonial.textContent && (
              <p className="leading-relaxed text-foreground/85">
                &ldquo;{testimonial.textContent}&rdquo;
              </p>
            )}
            {testimonial.type === "video" && (
              <VideoPlayer testimonialId={testimonial._id} />
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {testimonial.status === "pending" && (
                <>
                  <Button size="sm" variant="success" onClick={handleApprove}>
                    ✓ Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-destructive/25 text-destructive hover:bg-destructive/10"
                    disabled={leaving}
                    onClick={() =>
                      animateOut(() =>
                        setStatus({ testimonialId: testimonial._id, status: "rejected" })
                      )
                    }
                  >
                    ✕ Reject
                  </Button>
                </>
              )}
              {approveError && <ErrorWithUpgradeCta message={approveError} />}
              {testimonial.status === "approved" && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className={
                      testimonial.featured
                        ? "border-amber/40 bg-amber/15 text-amber-text hover:bg-amber/20"
                        : undefined
                    }
                    onClick={() =>
                      setFeatured({
                        testimonialId: testimonial._id,
                        featured: !testimonial.featured,
                      })
                    }
                  >
                    {testimonial.featured ? "★ Unfeature" : "☆ Feature"}
                  </Button>
                  <ImageGenerator testimonialId={testimonial._id} />
                </>
              )}
              <Button
                size="sm"
                variant="outline"
                className="border-destructive/25 text-destructive hover:bg-destructive/10"
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
        <button
          type="button"
          onClick={() => handleSortChange(sortOrder === "asc" ? "desc" : "asc")}
          className="flex items-center gap-2 rounded-lg border border-input bg-card px-3.5 py-2 text-sm font-medium hover:bg-muted"
        >
          ↕ {sortOrder === "asc" ? "Oldest first" : "Newest first"}
        </button>
      </div>

      <TabsContent value={tab} className="mt-4 space-y-3">
        {result === undefined && (
          <p className="text-muted-foreground">Loading…</p>
        )}
        {result !== undefined && total === 0 && (
          <div className="py-16 text-center text-muted-foreground">
            <p className="text-3xl">📭</p>
            <p className="mt-3">Nothing here yet.</p>
          </div>
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
                ← Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Next →
              </Button>
            </div>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
