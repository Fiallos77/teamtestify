"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QuestionsEditor, type SpaceQuestion } from "@/components/dashboard/questions-editor";
import { BrandingEditor, type SpaceBranding } from "@/components/dashboard/branding-editor";
import { CollectionPagePreview } from "@/components/dashboard/collection-page-preview";
import { RequestAssistant } from "@/components/dashboard/request-assistant";
import { PlanLimitUpgradeAlert } from "@/components/dashboard/plan-limit-upgrade-alert";
import { isUpgradeError } from "@/components/dashboard/upgrade-cta";
import {
  validateSpaceEditor,
  hasErrors,
  type SpaceEditorFieldErrors,
} from "@/components/dashboard/space-editor-validation";

export const SPACE_EDITOR_TABS = ["identity", "form", "collect", "thankyou", "ai"] as const;
export type SpaceEditorTab = (typeof SPACE_EDITOR_TABS)[number];

export function isSpaceEditorTab(value: string | null): value is SpaceEditorTab {
  return value !== null && (SPACE_EDITOR_TABS as readonly string[]).includes(value);
}

export interface SpaceEditorPayload {
  name: string;
  description?: string;
  publicSlug: string;
  isActive: boolean;
  businessDescription?: string;
  formConfig: {
    headline: string;
    subheading?: string;
    thankYouMessage?: string;
    allowText: boolean;
    allowVideo: boolean;
    collectRating: boolean;
    collectNameCompanyPhoto: boolean;
    collectAuthorEmail: boolean;
    questions: SpaceQuestion[];
  };
  branding: SpaceBranding;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Unified space editor: the same 5-tab form with a permanently visible live
// preview, used both to edit an existing space (settings) and to create a new
// one. In create mode the AI Assistant needs a saved space, so that tab shows a
// hint instead of the generator, and name/description/URL are required.
export function SpaceEditor({
  mode,
  space,
  spaceId,
  submitLabel,
  onSubmit,
  defaultTab = "identity",
}: {
  mode: "edit" | "create";
  space?: Doc<"spaces"> | null;
  spaceId?: Id<"spaces">;
  submitLabel: string;
  onSubmit: (payload: SpaceEditorPayload) => Promise<void>;
  defaultTab?: SpaceEditorTab;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [publicSlug, setPublicSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [branding, setBranding] = useState<SpaceBranding>({});
  const [headline, setHeadline] = useState("");
  const [subheading, setSubheading] = useState("");
  const [thankYouMessage, setThankYouMessage] = useState("");
  const [allowText, setAllowText] = useState(true);
  const [allowVideo, setAllowVideo] = useState(true);
  const [collectRating, setCollectRating] = useState(true);
  const [collectNameCompanyPhoto, setCollectNameCompanyPhoto] = useState(true);
  const [collectAuthorEmail, setCollectAuthorEmail] = useState(false);
  const [questions, setQuestions] = useState<SpaceQuestion[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [businessDescription, setBusinessDescription] = useState("");

  const [activeTab, setActiveTab] = useState<SpaceEditorTab>(defaultTab);
  const [fieldErrors, setFieldErrors] = useState<SpaceEditorFieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Clear a required-field error as soon as the user edits that field, so the
  // red styling and message go away while they type the fix.
  function clearFieldError(field: keyof SpaceEditorFieldErrors) {
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }

  useEffect(() => {
    // Seed the form once the space doc loads (edit mode). This is the standard
    // "sync local editable state from an async-loaded source" pattern — there's
    // nothing to feed a lazy useState initializer with on the first render.
    if (!space) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(space.name);
    setDescription(space.description ?? "");
    setPublicSlug(space.publicSlug);
    setSlugEdited(true);
    setBranding(space.branding);
    setHeadline(space.formConfig.headline);
    setSubheading(space.formConfig.subheading ?? "");
    setThankYouMessage(space.formConfig.thankYouMessage ?? "");
    setAllowText(space.formConfig.allowText);
    setAllowVideo(space.formConfig.allowVideo);
    setCollectRating(space.formConfig.collectRating);
    setCollectNameCompanyPhoto(space.formConfig.collectNameCompanyPhoto);
    setCollectAuthorEmail(space.formConfig.collectAuthorEmail ?? false);
    setQuestions(space.formConfig.questions);
    setIsActive(space.isActive);
    setBusinessDescription(space.businessDescription ?? "");
  }, [space]);

  const logoUrl = useQuery(
    api.spaces.getLogoUrl,
    branding.logoStorageId ? { logoStorageId: branding.logoStorageId } : "skip"
  );

  if (mode === "edit" && !space) {
    return <p className="text-muted-foreground">Loading…</p>;
  }

  // Never publish an empty headline: in create mode fall back to a friendly
  // default derived from the name (the schema requires a headline).
  const effectiveHeadline =
    mode === "create"
      ? headline.trim() || `Share your experience with ${name.trim() || "us"}`
      : headline;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const publicUrl = `${origin}/r/${publicSlug || "your-space"}`;

  function handleNameChange(value: string) {
    setName(value);
    clearFieldError("name");
    // Auto-fill the slug from the name only while creating and until the user
    // has touched the slug directly.
    if (mode === "create" && !slugEdited) {
      setPublicSlug(slugify(value));
      clearFieldError("publicSlug");
    }
  }

  // AI-generated guide questions are appended to the owner-editable list
  // (skipping any that already match), so they can be tweaked and saved.
  function applyGuideQuestions(generated: string[]) {
    setQuestions((prev) => {
      const existing = new Set(prev.map((q) => q.label.trim().toLowerCase()));
      const additions = generated
        .map((label) => label.trim())
        .filter((label) => label && !existing.has(label.toLowerCase()))
        .map((label) => ({ id: crypto.randomUUID(), label, required: false }));
      return [...prev, ...additions];
    });
  }

  async function handleSubmit() {
    // Validate on click (the button is never disabled). All required fields
    // live in the Identity tab, so surface the errors and jump there.
    const errors = validateSpaceEditor({ name, description, publicSlug }, mode);
    setFieldErrors(errors);
    if (hasErrors(errors)) {
      setActiveTab("identity");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        publicSlug: publicSlug.trim(),
        isActive,
        businessDescription: businessDescription.trim() || undefined,
        formConfig: {
          headline: effectiveHeadline,
          subheading: subheading.trim() || undefined,
          thankYouMessage: thankYouMessage.trim() || undefined,
          allowText,
          allowVideo,
          collectRating,
          collectNameCompanyPhoto,
          collectAuthorEmail,
          questions,
        },
        branding,
      });
      if (mode === "edit") {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="max-w-2xl space-y-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SpaceEditorTab)}>
          <TabsList>
            <TabsTrigger value="identity">Identity</TabsTrigger>
            <TabsTrigger value="form">Form</TabsTrigger>
            <TabsTrigger value="collect">Collect data</TabsTrigger>
            <TabsTrigger value="thankyou">Thank You</TabsTrigger>
            <TabsTrigger value="ai">✦ AI Assistant</TabsTrigger>
          </TabsList>

          {/* 1 — Identity: name, description, URL slug, logo, brand color */}
          <TabsContent value="identity" className="space-y-6 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="space-name">Space name</Label>
                  <Input
                    id="space-name"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Q3 Customer Feedback"
                    aria-invalid={!!fieldErrors.name}
                  />
                  {fieldErrors.name && (
                    <p className="text-sm text-destructive">{fieldErrors.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="space-description">
                    Internal description{mode === "edit" ? " (optional)" : ""}
                  </Label>
                  <Textarea
                    id="space-description"
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      clearFieldError("description");
                    }}
                    placeholder="What this space is for — only visible to your team."
                    rows={2}
                    aria-invalid={!!fieldErrors.description}
                  />
                  {fieldErrors.description && (
                    <p className="text-sm text-destructive">{fieldErrors.description}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="space-slug">Public URL slug</Label>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>/r/</span>
                    <Input
                      id="space-slug"
                      value={publicSlug}
                      onChange={(e) => {
                        setPublicSlug(slugify(e.target.value));
                        setSlugEdited(true);
                        clearFieldError("publicSlug");
                      }}
                      className="min-w-0 flex-1"
                      aria-invalid={!!fieldErrors.publicSlug}
                    />
                  </div>
                  {fieldErrors.publicSlug && (
                    <p className="text-sm text-destructive">{fieldErrors.publicSlug}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Public link</Label>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input readOnly value={publicUrl} className="min-w-0 flex-1" />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigator.clipboard.writeText(publicUrl)}
                    >
                      Copy
                    </Button>
                  </div>
                </div>

                {mode === "edit" && (
                  <div className="flex items-center justify-between rounded-xl border bg-muted/40 p-4">
                    <div>
                      <Label>Accepting responses</Label>
                      <p className="mt-1 text-sm text-muted-foreground">
                        While active, anyone with the link can submit a testimonial. Turn it off to
                        pause collection without deleting anything.
                      </p>
                    </div>
                    <Switch checked={isActive} onCheckedChange={setIsActive} />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Branding</CardTitle>
              </CardHeader>
              <CardContent>
                <BrandingEditor branding={branding} onChange={setBranding} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* 2 — Form: heading text, text/video toggles, guide questions */}
          <TabsContent value="form" className="space-y-6 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Form heading</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="headline">Headline</Label>
                  <Input
                    id="headline"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder={`Share your experience with ${name.trim() || "us"}`}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subheading">Description</Label>
                  <Textarea
                    id="subheading"
                    value={subheading}
                    onChange={(e) => setSubheading(e.target.value)}
                    placeholder="A short line explaining what you're asking for."
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Testimonial types</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between rounded-xl bg-muted/40 p-3.5">
                  <Label>Allow text testimonials</Label>
                  <Switch checked={allowText} onCheckedChange={setAllowText} />
                </div>
                <div className="flex items-center justify-between rounded-xl bg-muted/40 p-3.5">
                  <Label>Allow video testimonials</Label>
                  <Switch checked={allowVideo} onCheckedChange={setAllowVideo} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Guide questions</CardTitle>
              </CardHeader>
              <CardContent>
                <QuestionsEditor questions={questions} onChange={setQuestions} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* 3 — Collect data: which fields the form asks for */}
          <TabsContent value="collect" className="space-y-6 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Collect data</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between rounded-xl bg-muted/40 p-3.5">
                  <Label>Collect rating</Label>
                  <Switch checked={collectRating} onCheckedChange={setCollectRating} />
                </div>
                <div className="flex items-center justify-between rounded-xl bg-muted/40 p-3.5">
                  <Label>Collect name, company &amp; title</Label>
                  <Switch
                    checked={collectNameCompanyPhoto}
                    onCheckedChange={setCollectNameCompanyPhoto}
                  />
                </div>
                <div className="flex items-center justify-between rounded-xl bg-muted/40 p-3.5">
                  <div>
                    <Label>Collect author email</Label>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Optional — off by default to keep the form quick.
                    </p>
                  </div>
                  <Switch checked={collectAuthorEmail} onCheckedChange={setCollectAuthorEmail} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 4 — Thank You: post-submission message */}
          <TabsContent value="thankyou" className="space-y-6 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Thank you message</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Label htmlFor="thank-you">Shown after someone submits a testimonial</Label>
                <Textarea
                  id="thank-you"
                  value={thankYouMessage}
                  onChange={(e) => setThankYouMessage(e.target.value)}
                  placeholder="Thank you for sharing your feedback!"
                  rows={3}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* 5 — AI Assistant: needs a saved space to attach generated copy to */}
          <TabsContent value="ai" className="space-y-6 pt-4">
            {mode === "edit" && spaceId ? (
              <RequestAssistant
                spaceId={spaceId}
                businessDescription={businessDescription}
                onBusinessDescriptionChange={setBusinessDescription}
                cachedKit={
                  space?.requestAssistant
                    ? {
                        outreachEmail: space.requestAssistant.outreachEmail,
                        outreachWhatsApp: space.requestAssistant.outreachWhatsApp,
                        followUp: space.requestAssistant.followUp,
                        guideQuestions: space.requestAssistant.guideQuestions,
                      }
                    : null
                }
                onApplyGuideQuestions={applyGuideQuestions}
              />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>✦ AI Assistant</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Create your space first, then come back here to generate outreach emails,
                    WhatsApp messages, and guide questions with AI.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {error &&
          (isUpgradeError(error) ? (
            <PlanLimitUpgradeAlert title="Space limit reached" message={error} />
          ) : (
            <p className="text-sm text-destructive">{error}</p>
          ))}

        <div className="flex items-center gap-3">
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Saving…" : submitLabel}
          </Button>
          {saved && <span className="text-sm text-muted-foreground">Saved</span>}
        </div>
      </div>

      <div className="lg:sticky lg:top-6 lg:self-start">
        <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Live preview
        </p>
        <CollectionPagePreview
          headline={effectiveHeadline}
          subheading={subheading}
          logoUrl={logoUrl}
          branding={branding}
          allowText={allowText}
          allowVideo={allowVideo}
          collectAuthorEmail={collectAuthorEmail}
          collectNameCompanyPhoto={collectNameCompanyPhoto}
          collectRating={collectRating}
          questions={questions}
        />
      </div>
    </div>
  );
}
