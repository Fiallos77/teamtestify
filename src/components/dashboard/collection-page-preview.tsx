"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { SpaceQuestion } from "./questions-editor";
import type { SpaceBranding } from "./branding-editor";

const BACKGROUND_STYLES: Record<string, string> = {
  solid: "color-mix(in srgb, var(--primary) 8%, var(--background))",
  gradient:
    "linear-gradient(135deg, color-mix(in srgb, var(--primary) 15%, var(--background)), var(--background))",
};

// A read-only mirror of the real /r/[slug] page, driven by whatever is
// currently typed into the settings form (not yet saved) — lets the founder
// see how the collection page will look before publishing changes.
export function CollectionPagePreview({
  headline,
  subheading,
  logoUrl,
  branding,
  allowText,
  allowVideo,
  collectAuthorEmail,
  collectNameCompanyPhoto,
  collectRating,
  questions,
}: {
  headline: string;
  subheading: string;
  logoUrl: string | null | undefined;
  branding: SpaceBranding;
  allowText: boolean;
  allowVideo: boolean;
  collectAuthorEmail: boolean;
  collectNameCompanyPhoto: boolean;
  collectRating: boolean;
  questions: SpaceQuestion[];
}) {
  const [mode, setMode] = useState<"text" | "video" | null>(null);
  const canChooseMode = allowText && allowVideo;
  const effectiveMode: "text" | "video" | null = canChooseMode
    ? mode
    : allowVideo
      ? "video"
      : "text";

  const brandingStyle = {
    ...(branding.primaryColor ? { "--primary": branding.primaryColor } : {}),
    ...(branding.backgroundStyle && BACKGROUND_STYLES[branding.backgroundStyle]
      ? { background: BACKGROUND_STYLES[branding.backgroundStyle] }
      : {}),
  } as React.CSSProperties;

  return (
    <div style={brandingStyle} className="rounded-lg border p-6">
      {logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="mx-auto mb-4 size-16 rounded-full border object-cover" />
      )}
      <h1 className="text-xl font-semibold">{headline || "Share your experience"}</h1>
      {subheading && <p className="mt-2 text-sm text-muted-foreground">{subheading}</p>}

      <div className="mt-5 space-y-3">
        {canChooseMode && (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode("text")}
              className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
                mode === "text" ? "border-primary bg-primary text-primary-foreground" : "border-input"
              }`}
            >
              Write
            </button>
            <button
              type="button"
              onClick={() => setMode("video")}
              className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
                mode === "video" ? "border-primary bg-primary text-primary-foreground" : "border-input"
              }`}
            >
              Record video
            </button>
          </div>
        )}

        {effectiveMode && (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs">Your name</Label>
              <Input disabled placeholder="Jane Doe" />
            </div>

            {collectAuthorEmail && (
              <div className="space-y-1.5">
                <Label className="text-xs">Email (optional)</Label>
                <Input disabled placeholder="jane@example.com" />
              </div>
            )}

            {collectNameCompanyPhoto && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Title</Label>
                    <Input disabled />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Company</Label>
                    <Input disabled />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Your photo (optional)</Label>
                  <Input disabled type="file" />
                </div>
              </>
            )}

            {collectRating && (
              <div className="space-y-1.5">
                <Label className="text-xs">Rating</Label>
                <div className="flex gap-1 text-primary">★★★★★</div>
              </div>
            )}

            {questions.length > 0 && (
              <div className="space-y-2 rounded-md border bg-muted/40 p-3">
                {effectiveMode === "video" ? (
                  <>
                    <p className="text-xs font-medium">While recording, try to mention:</p>
                    <ul className="list-inside list-disc text-xs text-muted-foreground">
                      {questions.map((q) => (
                        <li key={q.id}>{q.label || "Untitled question"}</li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-medium">A couple of questions to guide you</p>
                    {questions.map((q) => (
                      <div key={q.id} className="space-y-1">
                        <Label className="text-xs">{q.label || "Untitled question"}</Label>
                        <Textarea disabled rows={2} />
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {effectiveMode === "text" ? (
              <Textarea disabled rows={4} placeholder="Share your experience…" />
            ) : (
              <div className="flex aspect-video items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">
                Video recorder
              </div>
            )}

            <Button disabled className="w-full">
              Submit testimonial
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
