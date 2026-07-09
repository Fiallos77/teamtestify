"use client";

import { use, useState } from "react";
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

type Status = "pending" | "approved" | "rejected";

function VideoPlayer({ testimonialId }: { testimonialId: Id<"testimonials"> }) {
  const url = useQuery(api.testimonials.getVideoUrl, { testimonialId });
  if (!url) return null;
  return (
    // eslint-disable-next-line jsx-a11y/media-has-caption
    <video src={url} controls className="mt-2 max-h-64 rounded-md" />
  );
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

  return (
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
              <Button
                size="sm"
                onClick={() =>
                  setStatus({ testimonialId: testimonial._id, status: "approved" })
                }
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setStatus({ testimonialId: testimonial._id, status: "rejected" })
                }
              >
                Reject
              </Button>
            </>
          )}
          {testimonial.status === "approved" && (
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
          )}
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive"
            onClick={() => remove({ testimonialId: testimonial._id })}
          >
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function InboxPage({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = use(params);
  const [tab, setTab] = useState<Status>("pending");
  const testimonials = useQuery(api.testimonials.listBySpace, {
    spaceId: spaceId as Id<"spaces">,
    status: tab,
  });

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as Status)}>
      <TabsList>
        <TabsTrigger value="pending">Pending</TabsTrigger>
        <TabsTrigger value="approved">Approved</TabsTrigger>
        <TabsTrigger value="rejected">Rejected</TabsTrigger>
      </TabsList>
      <TabsContent value={tab} className="mt-4 space-y-4">
        {testimonials === undefined && (
          <p className="text-muted-foreground">Loading…</p>
        )}
        {testimonials?.length === 0 && (
          <p className="text-muted-foreground">Nothing here yet.</p>
        )}
        {testimonials?.map((t) => (
          <TestimonialCard key={t._id} testimonial={t} />
        ))}
      </TabsContent>
    </Tabs>
  );
}
