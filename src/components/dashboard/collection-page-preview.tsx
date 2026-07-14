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
    <div className="overflow-hidden rounded-2xl border shadow-[0_14px_34px_rgba(28,20,24,0.1)]">
      <div className="flex items-center gap-1.5 border-b bg-muted/60 px-3 py-2">
        <span className="size-2.5 rounded-full bg-border" />
        <span className="size-2.5 rounded-full bg-border" />
        <span className="size-2.5 rounded-full bg-border" />
      </div>
      <div
        style={brandingStyle}
        className="max-h-[560px] overflow-auto bg-[linear-gradient(165deg,#FFF6EF,#FBF7F2_55%)] p-6"
      >
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="mx-auto mb-4 size-16 rounded-2xl border object-cover" />
        )}
        <h1 className="text-center font-heading text-xl font-bold">
          {headline || "Share your experience"}
        </h1>
        {subheading && (
          <p className="mt-2 text-center text-sm text-muted-foreground">{subheading}</p>
        )}

        <div className="mt-5 space-y-3 rounded-2xl border bg-card p-4">
          {canChooseMode && (
            <div className="flex gap-1 rounded-xl border bg-muted p-1">
              <button
                type="button"
                onClick={() => setMode("text")}
                className={`flex-1 rounded-lg py-1.5 text-sm font-medium ${
                  mode === "text" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                Write
              </button>
              <button
                type="button"
                onClick={() => setMode("video")}
                className={`flex-1 rounded-lg py-1.5 text-sm font-medium ${
                  mode === "video" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
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
              <div className="space-y-1.5 text-center">
                <Label className="justify-center text-xs">Rating</Label>
                <div className="flex justify-center gap-1 text-amber">★★★★★</div>
              </div>
            )}

            {questions.length > 0 && (
              <div className="space-y-2 rounded-xl border border-primary/20 bg-accent p-3">
                {effectiveMode === "video" ? (
                  <>
                    <p className="text-xs font-semibold text-accent-foreground">
                      While recording, try to mention:
                    </p>
                    <ul className="list-inside list-disc text-xs text-muted-foreground">
                      {questions.map((q) => (
                        <li key={q.id}>{q.label || "Untitled question"}</li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-semibold text-accent-foreground">
                      A couple of questions to guide you
                    </p>
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
    </div>
  );
}
