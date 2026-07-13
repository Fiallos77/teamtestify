"use client";

import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { Check, Copy, Loader2, Sparkles } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Kit = {
  outreachEmail: string;
  outreachWhatsApp: string;
  followUp: string;
  guideQuestions: string[];
};

function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      {copied ? "Copied" : (label ?? "Copy")}
    </Button>
  );
}

// One generated message shown inside a tab, with its own copy button. `value`
// is the model output in the owner's input language; we never translate it.
function GeneratedPanel({ title, value }: { title: string; value: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{title}</Label>
        {value && <CopyButton value={value} />}
      </div>
      {value ? (
        <Textarea readOnly value={value} rows={value.length > 160 ? 6 : 3} />
      ) : (
        <p className="text-sm text-muted-foreground">Nothing generated yet.</p>
      )}
    </div>
  );
}

// Renders Tab 2 sections 1–2: the business-description input + generate button
// ("Your Business") and, once a kit exists, the generated messages as tabs
// ("Generated"). `businessDescription` is controlled by the settings page so
// the page's single Save persists it. Section 3 (QuestionsEditor) lives in the
// page and is fed by onApplyGuideQuestions.
export function RequestAssistant({
  spaceId,
  businessDescription,
  onBusinessDescriptionChange,
  cachedKit,
  onApplyGuideQuestions,
}: {
  spaceId: Id<"spaces">;
  businessDescription: string;
  onBusinessDescriptionChange: (value: string) => void;
  cachedKit: Kit | null;
  onApplyGuideQuestions: (questions: string[]) => void;
}) {
  const usage = useQuery(api.ai.getUsage, {});
  const generate = useAction(api.ai.generateRequestKit);

  const [kit, setKit] = useState<Kit | null>(cachedKit);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  const remaining = usage?.request.remaining ?? null;
  const outOfCredits = remaining !== null && remaining <= 0;

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await generate({ spaceId, businessDescription });
      setKit({
        outreachEmail: res.outreachEmail,
        outreachWhatsApp: res.outreachWhatsApp,
        followUp: res.followUp,
        guideQuestions: res.guideQuestions,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong generating your kit.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Section 1 — Your Business */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-4" />
            Your Business
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="business-description">Describe your business in one sentence</Label>
            <Textarea
              id="business-description"
              value={businessDescription}
              onChange={(e) => onBusinessDescriptionChange(e.target.value)}
              placeholder="e.g. I'm a freelance interior designer for small cafés and restaurants."
              rows={2}
            />
            <p className="text-sm text-muted-foreground">
              Write in any language — the generated messages and questions come back in the
              same language you write in.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={handleGenerate}
              disabled={loading || !businessDescription.trim() || outOfCredits}
              title="Generate outreach messages and guide questions based on your description"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {loading ? "Generating…" : "AI Assistant"}
            </Button>
            {usage && (
              <span className="text-sm text-muted-foreground">
                {remaining} request generation{remaining === 1 ? "" : "s"} left this month
                {usage.plan === "free" && " · upgrade to Pro for more"}
              </span>
            )}
          </div>

          {outOfCredits && (
            <p className="text-sm text-muted-foreground">
              You&apos;ve used your request generations for this month.
            </p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      {/* Section 2 — Generated (only after a kit exists) */}
      {kit && (
        <Card>
          <CardHeader>
            <CardTitle>Generated</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="email">
              <TabsList>
                <TabsTrigger value="email">Email</TabsTrigger>
                <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
                <TabsTrigger value="followup">Follow-up</TabsTrigger>
                <TabsTrigger value="questions">Guide Questions</TabsTrigger>
              </TabsList>

              <TabsContent value="email" className="pt-4">
                <GeneratedPanel title="Outreach email" value={kit.outreachEmail} />
              </TabsContent>
              <TabsContent value="whatsapp" className="pt-4">
                <GeneratedPanel title="WhatsApp message" value={kit.outreachWhatsApp} />
              </TabsContent>
              <TabsContent value="followup" className="pt-4">
                <GeneratedPanel title="Follow-up reminder" value={kit.followUp} />
              </TabsContent>
              <TabsContent value="questions" className="space-y-3 pt-4">
                <div className="flex items-center justify-between">
                  <Label>Guide questions for your collection page</Label>
                  {kit.guideQuestions.length > 0 && (
                    <CopyButton value={kit.guideQuestions.join("\n")} label="Copy all" />
                  )}
                </div>
                {kit.guideQuestions.length > 0 ? (
                  <>
                    <ul className="list-inside list-disc space-y-1 text-sm">
                      {kit.guideQuestions.map((q, i) => (
                        <li key={i}>{q}</li>
                      ))}
                    </ul>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onApplyGuideQuestions(kit.guideQuestions);
                        setApplied(true);
                        setTimeout(() => setApplied(false), 2000);
                      }}
                    >
                      {applied ? "Added to your questions below" : "Use as guide questions"}
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      Adds them to your guide questions below — edit or reorder, then Save to
                      show them on your public collection page.
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No guide questions generated.</p>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </>
  );
}
