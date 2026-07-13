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
        <Tabs defaultValue="basico">
          <TabsList>
            <TabsTrigger value="basico">Básico</TabsTrigger>
            <TabsTrigger value="ia">AI Assistant</TabsTrigger>
          </TabsList>

          <TabsContent value="basico" className="space-y-6 pt-4">
            {/* Section 1 — Identificación */}
            <Card>
              <CardHeader>
                <CardTitle>Identificación</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="space-name">Nombre del espacio</Label>
                  <Input id="space-name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="space-description">Descripción interna (opcional)</Label>
                  <Textarea
                    id="space-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Para qué es este espacio — solo visible para tu equipo."
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Enlace público</Label>
                  <div className="flex items-center gap-2">
                    <Input readOnly value={publicUrl} />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigator.clipboard.writeText(publicUrl)}
                    >
                      Copiar
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Aceptando respuestas</Label>
                    <p className="text-sm text-muted-foreground">
                      Controla tu enlace público de arriba. Mientras esté activo, cualquiera con el
                      enlace puede enviar un testimonio. Desactívalo para pausar la recolección — los
                      visitantes verán un mensaje de &quot;no disponible&quot; en lugar del
                      formulario, sin borrar nada.
                    </p>
                  </div>
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                </div>
              </CardContent>
            </Card>

            {/* Section 2 — Textos del formulario */}
            <Card>
              <CardHeader>
                <CardTitle>Textos del formulario</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="headline">Título</Label>
                  <Input
                    id="headline"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subheading">Descripción</Label>
                  <Textarea
                    id="subheading"
                    value={subheading}
                    onChange={(e) => setSubheading(e.target.value)}
                    placeholder="Una línea breve explicando qué estás pidiendo."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="thank-you">Mensaje de gracias</Label>
                  <Textarea
                    id="thank-you"
                    value={thankYouMessage}
                    onChange={(e) => setThankYouMessage(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Section 3 — Recopilar datos */}
            <Card>
              <CardHeader>
                <CardTitle>Recopilar datos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Permitir testimonios de texto</Label>
                  <Switch checked={allowText} onCheckedChange={setAllowText} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Permitir testimonios de video</Label>
                  <Switch checked={allowVideo} onCheckedChange={setAllowVideo} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Recopilar calificación</Label>
                  <Switch checked={collectRating} onCheckedChange={setCollectRating} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Recopilar nombre, empresa y cargo</Label>
                  <Switch
                    checked={collectNameCompanyPhoto}
                    onCheckedChange={setCollectNameCompanyPhoto}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Recopilar email del autor</Label>
                    <p className="text-sm text-muted-foreground">
                      Opcional — desactivado por defecto para mantener el formulario ágil.
                    </p>
                  </div>
                  <Switch checked={collectAuthorEmail} onCheckedChange={setCollectAuthorEmail} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ia" className="space-y-6 pt-4">
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
          <Button onClick={handleSave}>Guardar cambios</Button>
          {saved && <span className="text-sm text-muted-foreground">Guardado</span>}
        </div>
      </div>

      <div className="lg:sticky lg:top-6 lg:self-start">
        <p className="mb-3 text-sm font-medium text-muted-foreground">Vista previa en vivo</p>
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
    </div>
  );
}
