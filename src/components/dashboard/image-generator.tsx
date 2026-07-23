"use client";

import { useEffect, useRef, useState } from "react";
import { useAction, useQuery } from "convex/react";
import { Image as ImageIcon, Download, Sparkles, Loader2 } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  IMAGE_SIZES,
  IMAGE_SIZE_KEYS,
  LAYOUT_LABELS,
  type ImageSizeKey,
  type LayoutId,
} from "@/lib/testimonial-image/types";
import { AiQuotaUpgradeAlert } from "./ai-quota-upgrade-alert";
import { buildRenderRequestBody, type ImageProposal as Proposal } from "./image-generator-render";

// Debounce delay for re-rendering the preview after a headline edit — long
// enough that a typing user doesn't trigger a render per keystroke, short
// enough that the preview still feels responsive.
const HEADLINE_RENDER_DEBOUNCE_MS = 500;

// One client-side retry to match the "first attempt errors, second works"
// transient behaviour; surfaces the server's message on a hard failure.
async function renderPng(
  token: string,
  footer: string | undefined,
  proposal: Proposal,
  headline: string,
  size: ImageSizeKey
): Promise<Blob> {
  const body = JSON.stringify(buildRenderRequestBody({ token, footer, proposal, headline, size }));
  let lastErr = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch("/api/testimonial-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      if (res.ok) return await res.blob();
      lastErr = (await res.text()) || `Render failed (${res.status})`;
    } catch (e) {
      lastErr = e instanceof Error ? e.message : "Network error";
    }
  }
  throw new Error(lastErr);
}

export function ImageGenerator({ testimonialId }: { testimonialId: Id<"testimonials"> }) {
  const usage = useQuery(api.ai.getUsage, {});
  const generate = useAction(api.images.generateImageProposal);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [footer, setFooter] = useState<string | undefined>(undefined);
  const [watermark, setWatermark] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<ImageSizeKey | null>(null);
  const [editedHeadline, setEditedHeadline] = useState("");
  const headlineDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (headlineDebounceRef.current) clearTimeout(headlineDebounceRef.current);
    };
  }, []);

  const remaining = usage?.image.remaining ?? null;
  const outOfCredits = remaining !== null && remaining <= 0;

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setSelected(null);
    setPreviewUrl(null);
    setEditedHeadline("");
    try {
      const res = await generate({ testimonialId });
      setProposals(res.proposals);
      setToken(res.token);
      setFooter(res.footer);
      setWatermark(res.watermark);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't generate image proposals.");
    } finally {
      setLoading(false);
    }
  }

  async function renderPreview(proposal: Proposal, headline: string) {
    if (!token) return;
    setPreviewUrl(null);
    setError(null);
    try {
      const blob = await renderPng(token, footer, proposal, headline, "square");
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (e) {
      setError(e instanceof Error ? `Couldn't render the preview: ${e.message}` : "Couldn't render the preview.");
    }
  }

  async function pick(index: number) {
    if (!token) return;
    setSelected(index);
    setEditedHeadline(proposals[index].headline);
    await renderPreview(proposals[index], proposals[index].headline);
  }

  function handleHeadlineChange(value: string) {
    setEditedHeadline(value);
    if (selected === null) return;
    if (headlineDebounceRef.current) clearTimeout(headlineDebounceRef.current);
    const proposal = proposals[selected];
    headlineDebounceRef.current = setTimeout(() => {
      renderPreview(proposal, value);
    }, HEADLINE_RENDER_DEBOUNCE_MS);
  }

  async function download(size: ImageSizeKey) {
    if (!token || selected === null) return;
    setDownloading(size);
    setError(null);
    try {
      const blob = await renderPng(token, footer, proposals[selected], editedHeadline, size);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `testimonial-${size}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? `Couldn't render ${IMAGE_SIZES[size].label}: ${e.message}` : "Couldn't render that size.");
    } finally {
      setDownloading(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <ImageIcon className="size-4" />
        Create image
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4" />
            Social image generator
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={handleGenerate} disabled={loading || outOfCredits}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              {loading ? "Generating…" : proposals.length ? "Regenerate" : "Generate proposals"}
            </Button>
            {usage && (
              <span className="text-sm text-muted-foreground">
                {remaining} image generation{remaining === 1 ? "" : "s"} left this month
                {usage.plan === "free" && " · upgrade to Pro to remove the watermark"}
              </span>
            )}
          </div>

          {outOfCredits && <AiQuotaUpgradeAlert />}
          {error && <p className="text-sm text-destructive">{error}</p>}

          {proposals.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Pick a layout</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {proposals.map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => pick(i)}
                    className={`rounded-xl border p-3 text-left text-sm ${
                      selected === i ? "border-primary ring-2 ring-primary/40" : "border-input"
                    }`}
                  >
                    <span className="block font-medium">
                      {LAYOUT_LABELS[p.layout as LayoutId] ?? p.layout}
                    </span>
                    <span className="mt-1 block text-muted-foreground">{p.headline}</span>
                    <span className="mt-1 block text-xs text-muted-foreground/70">
                      {p.backgroundType} background
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {selected !== null && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="image-headline">Headline</Label>
                <Input
                  id="image-headline"
                  value={editedHeadline}
                  onChange={(e) => handleHeadlineChange(e.target.value)}
                  maxLength={240}
                />
              </div>
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="Preview" className="mx-auto w-64 rounded-xl border" />
              ) : (
                <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Rendering…
                </p>
              )}
              {watermark && (
                <p className="text-center text-xs text-muted-foreground">
                  Free images include a &quot;Hecho con TeamTestify&quot; watermark.
                </p>
              )}
              <div className="flex flex-wrap justify-center gap-2">
                {IMAGE_SIZE_KEYS.map((size) => (
                  <Button
                    key={size}
                    size="sm"
                    variant="outline"
                    disabled={downloading !== null}
                    onClick={() => download(size)}
                    title={IMAGE_SIZES[size].label}
                  >
                    {downloading === size ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Download className="size-4" />
                    )}
                    {IMAGE_SIZES[size].network}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
