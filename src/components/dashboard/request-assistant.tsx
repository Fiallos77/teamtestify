"use client";

import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { Check, Copy, Sparkles } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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

function GeneratedText({ title, value }: { title: string; value: string }) {
  if (!value) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{title}</Label>
        <CopyButton value={value} />
      </div>
      <Textarea readOnly value={value} rows={value.length > 160 ? 5 : 3} />
    </div>
  );
}

export function RequestAssistant({
  spaceId,
  initialDescription,
  cachedKit,
  onApplyGuideQuestions,
}: {
  spaceId: Id<"spaces">;
  initialDescription: string;
  cachedKit: Kit | null;
  onApplyGuideQuestions: (questions: string[]) => void;
}) {
  const usage = useQuery(api.ai.getUsage, {});
  const generate = useAction(api.ai.generateRequestKit);

  const [description, setDescription] = useState(initialDescription);
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
      const res = await generate({ spaceId, businessDescription: description });
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4" />
          AI request assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Describe your business in one sentence. We&apos;ll draft an outreach message
          (with your collection link), three guide questions for your customers, and a
          follow-up reminder — in the same language you write in.
        </p>

        <div className="space-y-2">
          <Label htmlFor="business-description">Your business, in one sentence</Label>
          <Textarea
            id="business-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. I'm a freelance interior designer for small cafés and restaurants."
            rows={2}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={handleGenerate} disabled={loading || !description.trim() || outOfCredits}>
            {loading ? "Generating…" : kit ? "Regenerate" : "Generate"}
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

        {kit && (
          <div className="space-y-4 border-t pt-4">
            <GeneratedText title="Outreach email" value={kit.outreachEmail} />
            <GeneratedText title="WhatsApp message" value={kit.outreachWhatsApp} />
            <GeneratedText title="Follow-up reminder" value={kit.followUp} />

            {kit.guideQuestions.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Guide questions for your collection page</Label>
                  <CopyButton value={kit.guideQuestions.join("\n")} label="Copy all" />
                </div>
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
                  {applied ? "Added to guided prompts below" : "Use as guided prompts"}
                </Button>
                <p className="text-sm text-muted-foreground">
                  Adds them to your guided prompts below — edit or reorder, then Save to
                  show them on your public collection page.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
