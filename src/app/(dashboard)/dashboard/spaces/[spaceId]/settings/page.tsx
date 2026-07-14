"use client";

import { use, useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QuestionsEditor, type SpaceQuestion } from "@/components/dashboard/questions-editor";
import { CollectionPagePreview } from "@/components/dashboard/collection-page-preview";
import { RequestAssistant } from "@/components/dashboard/request-assistant";

export default function SpaceSettingsPage({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = use(params);
  const id = spaceId as Id<"spaces">;
  const space = useQuery(api.spaces.get, { spaceId: id });
  const update = useMutation(api.spaces.update);
  const logoUrl = useQuery(
    api.spaces.getLogoUrl,
    space?.branding.logoStorageId ? { logoStorageId: space.branding.logoStorageId } : "skip"
  );

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
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
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!space) return;
    setName(space.name);
    setDescription(space.description ?? "");
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

  if (!space) return <p className="text-muted-foreground">Loading…</p>;

  const publicUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/r/${space.publicSlug}`
      : `/r/${space.publicSlug}`;

  async function handleSave() {
    await update({
      spaceId: id,
      name,
      description: description || undefined,
      isActive,
      businessDescription: businessDescription || undefined,
      formConfig: {
        ...space!.formConfig,
        headline,
        subheading: subheading || undefined,
        thankYouMessage,
        allowText,
        allowVideo,
        collectRating,
        collectNameCompanyPhoto,
        collectAuthorEmail,
        questions,
      },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  // AI-generated guide questions land in the owner-editable guided prompts
  // below (skipping any that already match), so the owner can tweak/reorder
  // and Save to publish them on the public collection page.
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

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="max-w-2xl space-y-6">
        <Tabs defaultValue="basic">
          <TabsList>
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="ai">✦ AI Assistant</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-6 pt-4">
            {/* Section 1 — Details */}
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="space-name">Space name</Label>
                  <Input id="space-name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="space-description">Internal description (optional)</Label>
                  <Textarea
                    id="space-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What this space is for — only visible to your team."
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Public link</Label>
                  <div className="flex items-center gap-2">
                    <Input readOnly value={publicUrl} />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigator.clipboard.writeText(publicUrl)}
                    >
                      Copy
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-xl border bg-muted/40 p-4">
                  <div>
                    <Label>Accepting responses</Label>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Controls your public link above. While active, anyone with the link can
                      submit a testimonial. Turn it off to pause collection — visitors will see
                      an &quot;unavailable&quot; message instead of the form, without deleting
                      anything.
                    </p>
                  </div>
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                </div>
              </CardContent>
            </Card>

            {/* Section 2 — Form text */}
            <Card>
              <CardHeader>
                <CardTitle>Form text</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="headline">Headline</Label>
                  <Input
                    id="headline"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
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

                <div className="space-y-2">
                  <Label htmlFor="thank-you">Thank-you message</Label>
                  <Textarea
                    id="thank-you"
                    value={thankYouMessage}
                    onChange={(e) => setThankYouMessage(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Section 3 — Collect data */}
            <Card>
              <CardHeader>
                <CardTitle>Collect data</CardTitle>
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

          <TabsContent value="ai" className="space-y-6 pt-4">
            {/* Sections 1–2 (Your Business + Generated) live in RequestAssistant;
                businessDescription is controlled here so the page Save persists it. */}
            <RequestAssistant
              spaceId={id}
              businessDescription={businessDescription}
              onBusinessDescriptionChange={setBusinessDescription}
              cachedKit={
                space.requestAssistant
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

            {/* Section 3 — Customize Your Questions */}
            <Card>
              <CardHeader>
                <CardTitle>Guide Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <QuestionsEditor questions={questions} onChange={setQuestions} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex items-center gap-3">
          <Button onClick={handleSave}>Save changes</Button>
        </div>
      </div>

      <div className="lg:sticky lg:top-6 lg:self-start">
        <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Live preview
        </p>
        <CollectionPagePreview
          headline={headline}
          subheading={subheading}
          logoUrl={logoUrl}
          branding={space.branding}
          allowText={allowText}
          allowVideo={allowVideo}
          collectAuthorEmail={collectAuthorEmail}
          collectNameCompanyPhoto={collectNameCompanyPhoto}
          collectRating={collectRating}
          questions={questions}
        />
      </div>

      {/* Brief save confirmation — the `saved` flag clears itself after 2s. */}
      {saved && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 right-4 z-50 rounded-xl bg-foreground px-4 py-2 text-sm text-background shadow-lg animate-in fade-in slide-in-from-bottom-2"
        >
          Questions saved
        </div>
      )}
    </div>
  );
}
