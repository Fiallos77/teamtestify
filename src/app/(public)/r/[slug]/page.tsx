"use client";

import { use, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { VideoRecorder } from "@/components/public/video-recorder";
import { getVisitorId } from "@/lib/visitor-id";

const BACKGROUND_STYLES: Record<string, string> = {
  solid: "color-mix(in srgb, var(--primary) 8%, var(--background))",
  gradient:
    "linear-gradient(135deg, color-mix(in srgb, var(--primary) 15%, var(--background)), var(--background))",
};

export default function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const space = useQuery(api.public.getSpaceBySlug, { publicSlug: slug });
  const generateUploadUrl = useMutation(api.public.generateUploadUrl);
  const submitText = useMutation(api.public.submitTextTestimonial);
  const submitVideo = useMutation(api.public.submitVideoTestimonial);

  const [mode, setMode] = useState<"text" | "video" | null>(null);
  const [authorName, setAuthorName] = useState("");
  const [authorEmail, setAuthorEmail] = useState("");
  const [authorTitle, setAuthorTitle] = useState("");
  const [authorCompany, setAuthorCompany] = useState("");
  const [rating, setRating] = useState(5);
  const [textContent, setTextContent] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [website, setWebsite] = useState(""); // honeypot
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (space === undefined) {
    return <p className="p-8 text-center text-muted-foreground">Loading…</p>;
  }
  if (space === null) {
    return (
      <p className="p-8 text-center text-muted-foreground">
        This collection page isn&apos;t available.
      </p>
    );
  }

  const canChooseMode = space.formConfig.allowText && space.formConfig.allowVideo;
  const effectiveMode: "text" | "video" | null = canChooseMode
    ? mode
    : space.formConfig.allowVideo
      ? "video"
      : "text";

  const brandingStyle = {
    ...(space.branding.primaryColor
      ? { "--primary": space.branding.primaryColor }
      : {}),
    ...(space.branding.backgroundStyle &&
    BACKGROUND_STYLES[space.branding.backgroundStyle]
      ? { background: BACKGROUND_STYLES[space.branding.backgroundStyle] }
      : {}),
  } as React.CSSProperties;

  if (done) {
    return (
      <div style={brandingStyle} className="min-h-screen">
        <div className="mx-auto max-w-md p-8 text-center">
          <p className="text-lg font-medium">
            {space.formConfig.thankYouMessage ?? "Thank you!"}
          </p>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!space) return;
    setSubmitting(true);
    setError(null);
    try {
      const visitorId = getVisitorId();
      let authorPhotoStorageId: Id<"_storage"> | undefined;
      if (photoFile) {
        const photoUploadUrl = await generateUploadUrl({
          spaceId: space._id as Id<"spaces">,
          visitorId,
        });
        const photoRes = await fetch(photoUploadUrl, {
          method: "POST",
          headers: { "Content-Type": photoFile.type || "application/octet-stream" },
          body: photoFile,
        });
        if (!photoRes.ok) {
          throw new Error(`Photo upload failed (${photoRes.status}): ${await photoRes.text()}`);
        }
        const photoJson = await photoRes.json();
        authorPhotoStorageId = photoJson.storageId;
      }

      const common = {
        spaceId: space._id as Id<"spaces">,
        authorName,
        authorEmail: authorEmail || undefined,
        authorTitle: authorTitle || undefined,
        authorCompany: authorCompany || undefined,
        authorPhotoStorageId,
        rating: space.formConfig.collectRating ? rating : undefined,
        website: website || undefined,
      };

      if (effectiveMode === "text") {
        if (!textContent.trim()) throw new Error("Please write your testimonial");
        await submitText({ ...common, textContent });
      } else {
        if (!videoFile) throw new Error("Please record or upload a video");
        const uploadUrl = await generateUploadUrl({
          spaceId: space._id as Id<"spaces">,
          visitorId,
        });
        // Strip codec parameters (e.g. "video/webm;codecs=vp9,opus") — Convex's
        // upload endpoint rejects Content-Type headers with extra parameters.
        const baseMimeType = (videoFile.type || "application/octet-stream").split(";")[0];
        const res = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": baseMimeType },
          body: videoFile,
        });
        if (!res.ok) {
          throw new Error(`Video upload failed (${res.status}): ${await res.text()}`);
        }
        const { storageId } = await res.json();
        if (!storageId) throw new Error("Video upload did not return a storage id");
        const result = await submitVideo({ ...common, storageId, mimeType: videoFile.type });
        if (!result.ok) throw new Error(result.error);
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={brandingStyle} className="min-h-screen">
      <div className="mx-auto max-w-lg p-8">
        {space.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={space.logoUrl}
            alt=""
            className="mx-auto mb-4 size-20 rounded-full border object-cover"
          />
        )}
        <h1 className="text-2xl font-semibold">{space.formConfig.headline}</h1>
        {space.formConfig.subheading && (
          <p className="mt-2 text-muted-foreground">{space.formConfig.subheading}</p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="text"
            name="website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            className="hidden"
            tabIndex={-1}
            autoComplete="off"
          />

          {canChooseMode && (
            <div className="space-y-2">
              <Label>How would you like to share?</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode("text")}
                  className={`rounded-md border px-4 py-2 text-sm font-medium ${
                    mode === "text"
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input"
                  }`}
                >
                  Write
                </button>
                <button
                  type="button"
                  onClick={() => setMode("video")}
                  className={`rounded-md border px-4 py-2 text-sm font-medium ${
                    mode === "video"
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input"
                  }`}
                >
                  Record video
                </button>
              </div>
            </div>
          )}

          {effectiveMode && (
            <>
              <div className="space-y-2">
                <Label htmlFor="author-name">Your name</Label>
                <Input
                  id="author-name"
                  required
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                />
              </div>

              {space.formConfig.collectAuthorEmail && (
                <div className="space-y-2">
                  <Label htmlFor="author-email">Email (optional)</Label>
                  <Input
                    id="author-email"
                    type="email"
                    value={authorEmail}
                    onChange={(e) => setAuthorEmail(e.target.value)}
                  />
                </div>
              )}

              {space.formConfig.collectNameCompanyPhoto && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="author-title">Title</Label>
                      <Input
                        id="author-title"
                        value={authorTitle}
                        onChange={(e) => setAuthorTitle(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="author-company">Company</Label>
                      <Input
                        id="author-company"
                        value={authorCompany}
                        onChange={(e) => setAuthorCompany(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="author-photo">Your photo (optional)</Label>
                    <Input
                      id="author-photo"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                    />
                  </div>
                </>
              )}

              {space.formConfig.collectRating && (
                <div className="space-y-2">
                  <Label>Rating</Label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        type="button"
                        key={n}
                        onClick={() => setRating(n)}
                        className={n <= rating ? "text-primary" : "text-muted-foreground"}
                        aria-label={`${n} stars`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Guide questions are prompts only — never response fields.
                  Both modes show them as talking points; the single input is
                  the main textarea (text) or the recording (video). */}
              {space.formConfig.questions.length > 0 && (
                <div className="space-y-3 rounded-md border bg-muted/40 p-4">
                  <p className="text-sm font-medium">
                    {effectiveMode === "video"
                      ? "While recording, try to mention:"
                      : "While sharing your testimonial, consider mentioning:"}
                  </p>
                  <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                    {space.formConfig.questions.map((q) => (
                      <li key={q.id}>{q.label}</li>
                    ))}
                  </ul>
                </div>
              )}

              {effectiveMode === "text" ? (
                <Textarea
                  rows={5}
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Share your experience…"
                />
              ) : (
                <div className="space-y-3">
                  <VideoRecorder onRecorded={setVideoFile} maxSeconds={space.maxVideoSeconds} />
                  <div className="text-sm text-muted-foreground">or</div>
                  <Input
                    type="file"
                    accept="video/*"
                    onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
                  />
                </div>
              )}

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Submitting…" : "Submit testimonial"}
              </Button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
