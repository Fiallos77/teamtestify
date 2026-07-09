"use client";

import { useRef, useState } from "react";
import { Play, Star, X } from "lucide-react";
import type { EmbedStyle, EmbedTestimonial } from "./types";

const LONG_TEXT_THRESHOLD = 220;

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function TestimonialCard({
  testimonial,
  style,
  onClick,
  className = "",
  fixedSize = false,
}: {
  testimonial: EmbedTestimonial;
  style: EmbedStyle;
  onClick?: () => void;
  className?: string;
  // Grid/carousel cards should all read as the same size regardless of
  // whether the content is a text blurb or a video — masonry is the one
  // layout where staggered heights are the point, so it opts out.
  fixedSize?: boolean;
}) {
  const [playing, setPlaying] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const meta = [testimonial.authorTitle, testimonial.authorCompany]
    .filter(Boolean)
    .join(" · ");
  const showDate = style.showDate !== false;
  const isLongText =
    testimonial.type === "text" && (testimonial.textContent?.length ?? 0) > LONG_TEXT_THRESHOLD;

  return (
    <div
      className={`flex ${fixedSize ? "h-[22rem]" : "h-full"} break-inside-avoid flex-col gap-2 rounded-xl border bg-card p-4 text-card-foreground ${className}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
    >
      <div className="flex items-center gap-2.5">
        {style.showAvatar && testimonial.authorPhotoUrl && (
          <img
            src={testimonial.authorPhotoUrl}
            alt=""
            className="size-10 shrink-0 rounded-full bg-muted object-cover"
            onError={(e) => {
              e.currentTarget.style.visibility = "hidden";
            }}
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">{testimonial.authorName}</div>
          {meta && <div className="text-xs text-muted-foreground">{meta}</div>}
        </div>
        {showDate && (
          <div className="shrink-0 text-xs text-muted-foreground">
            {formatDate(testimonial.submittedAt)}
          </div>
        )}
      </div>
      {style.showRating && testimonial.rating ? (
        <div className="flex gap-0.5 text-primary">
          {Array.from({ length: testimonial.rating }).map((_, i) => (
            <Star key={i} className="size-3.5 fill-current" />
          ))}
        </div>
      ) : null}
      {testimonial.type === "video" && testimonial.videoUrl ? (
        // Fixed aspect-ratio + click-to-play (no autoplay) keeps every card
        // the same height regardless of content type — a video card sitting
        // next to a text card shouldn't suddenly dwarf it in a grid/carousel.
        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
          <video
            ref={videoRef}
            src={testimonial.videoUrl}
            preload="metadata"
            controls={playing}
            onClick={(e) => e.stopPropagation()}
            className="size-full object-cover"
          />
          {!playing && (
            <button
              type="button"
              aria-label="Play video"
              onClick={(e) => {
                e.stopPropagation();
                setPlaying(true);
                videoRef.current?.play();
              }}
              className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors hover:bg-black/30"
            >
              <span className="flex size-12 items-center justify-center rounded-full bg-white/90 text-black">
                <Play className="size-5 translate-x-0.5 fill-current" />
              </span>
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="line-clamp-6 flex-1 text-sm leading-relaxed">{testimonial.textContent}</p>
          {isLongText && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(true);
              }}
              className="self-start text-xs font-medium text-primary hover:underline"
            >
              Read more
            </button>
          )}
        </>
      )}

      {expanded && (
        // A floating overlay confined to this card's own document (the
        // embed iframe) — it must never push or resize the host page the
        // widget is dropped into, so this can't be an in-place expansion.
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(false);
          }}
        >
          <div
            className="relative max-h-[80vh] w-full max-w-md overflow-y-auto rounded-xl border bg-card p-5 text-card-foreground shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Close"
              onClick={() => setExpanded(false)}
              className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
            <div className="mb-3 flex items-center gap-2.5">
              {style.showAvatar && testimonial.authorPhotoUrl && (
                <img
                  src={testimonial.authorPhotoUrl}
                  alt=""
                  className="size-10 shrink-0 rounded-full bg-muted object-cover"
                />
              )}
              <div>
                <div className="text-sm font-semibold">{testimonial.authorName}</div>
                {meta && <div className="text-xs text-muted-foreground">{meta}</div>}
              </div>
            </div>
            <p className="text-sm leading-relaxed">{testimonial.textContent}</p>
          </div>
        </div>
      )}
    </div>
  );
}
