"use client";

import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { Image as ImageIcon, Download, Sparkles } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
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

type Proposal = { layout: string; headline: string };

async function renderPng(payload: {
  token: string;
  layout: string;
  headline: string;
  size: ImageSizeKey;
}): Promise<Blob> {
  const res = await fetch("/api/testimonial-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.blob();
}

export function ImageGenerator({ testimonialId }: { testimonialId: Id<"testimonials"> }) {
  const usage = useQuery(api.ai.getUsage, {});
  const generate = useAction(api.images.generateImageProposal);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [watermark, setWatermark] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<ImageSizeKey | null>(null);

  const remaining = usage?.image.remaining ?? null;
  const outOfCredits = remaining !== null && remaining <= 0;

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setSelected(null);
    setPreviewUrl(null);
    try {
      const res = await generate({ testimonialId });
      setProposals(res.proposals);
      setToken(res.token);
      setWatermark(res.watermark);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't generate image proposals.");
    } finally {
      setLoading(false);
    }
  }

  async function pick(index: number) {
    if (!token) return;
    setSelected(index);
    setPreviewUrl(null);
    setError(null);
    try {
      const blob = await renderPng({ token, ...proposals[index], size: "square" });
      setPreviewUrl(URL.createObjectURL(blob));
    } catch {
      setError("Couldn't render the preview.");
    }
  }

  async function download(size: ImageSizeKey) {
    if (!token || selected === null) return;
    setDownloading(size);
    setError(null);
    try {
      const blob = await renderPng({ token, ...proposals[selected], size });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `testimonial-${size}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Couldn't render that size. Try again.");
    } finally {
      setDownloading(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
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
              {loading ? "Generating…" : proposals.length ? "Regenerate" : "Generate proposals"}
            </Button>
            {usage && (
              <span className="text-sm text-muted-foreground">
                {remaining} image generation{remaining === 1 ? "" : "s"} left this month
                {usage.plan === "free" && " · upgrade to Pro to remove the watermark"}
              </span>
            )}
          </div>

          {outOfCredits && !proposals.length && (
            <p className="text-sm text-muted-foreground">
              You&apos;ve used your image generations for this month.
            </p>
          )}
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
                    className={`rounded-md border p-3 text-left text-sm ${
                      selected === i ? "border-primary ring-2 ring-primary/40" : "border-input"
                    }`}
                  >
                    <span className="block font-medium">
                      {LAYOUT_LABELS[p.layout as LayoutId] ?? p.layout}
                    </span>
                    <span className="mt-1 block text-muted-foreground">{p.headline}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {selected !== null && (
            <div className="space-y-3">
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="mx-auto w-64 rounded-md border"
                />
              ) : (
                <p className="text-sm text-muted-foreground">Rendering preview…</p>
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
                  >
                    <Download className="size-4" />
                    {downloading === size ? "…" : IMAGE_SIZES[size].label}
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
