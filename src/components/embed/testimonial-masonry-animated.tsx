"use client";

import { useEffect, useRef, useState } from "react";
import { Heart } from "lucide-react";
import { TestimonialCard } from "./testimonial-card";
import type { EmbedStyle, EmbedTestimonial } from "./types";

const SPEED_SECONDS: Record<NonNullable<EmbedStyle["scrollSpeed"]>, number> = {
  slow: 55,
  normal: 32,
  fast: 18,
};

// Keeps the widget from ever ballooning to fit however many testimonials
// exist — this is a bounded "ticker" viewport, not a growing list.
const DEFAULT_MAX_HEIGHT = 480;

// Longhand animation properties throughout this file, never the `animation`
// shorthand: React warns ("mixing shorthand and non-shorthand properties")
// when a shorthand and a longhand (e.g. animationPlayState, for pause-on-hover)
// both touch the same style object across rerenders.
function track(
  name: string,
  durationSeconds: number,
  playState: "running" | "paused",
  delay = "0s",
  reverse = false
) {
  return {
    animationName: name,
    animationDuration: `${durationSeconds}s`,
    animationTimingFunction: "linear",
    animationIterationCount: "infinite",
    animationDirection: reverse ? "reverse" : "normal",
    animationPlayState: playState,
    animationDelay: delay,
  } as React.CSSProperties;
}

type FloatingHeart = { id: number; left: number; duration: number; size: number };

// An ambient overlay of hearts that spawn at random spots and float up and
// fade out — not tied to any one card, closer to the "reactions" effect on
// testimonial.to's own Wall of Love than a badge fixed to a single card.
function HeartOverlay({ active }: { active: boolean }) {
  const [hearts, setHearts] = useState<FloatingHeart[]>([]);
  const nextId = useRef(0);

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      const id = nextId.current++;
      const heart: FloatingHeart = {
        id,
        left: 5 + Math.random() * 85,
        duration: 2.4 + Math.random() * 1.2,
        size: 12 + Math.random() * 8,
      };
      setHearts((prev) => [...prev, heart]);
      setTimeout(() => {
        setHearts((prev) => prev.filter((h) => h.id !== id));
      }, heart.duration * 1000);
    }, 900);
    return () => clearInterval(interval);
  }, [active]);

  if (!active) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      {hearts.map((h) => (
        <Heart
          key={h.id}
          className="absolute bottom-2 fill-current text-red-500"
          style={{
            left: `${h.left}%`,
            width: h.size,
            height: h.size,
            animationName: "heart-float",
            animationDuration: `${h.duration}s`,
            animationTimingFunction: "ease-out",
            animationIterationCount: 1,
            animationFillMode: "forwards",
          }}
        />
      ))}
    </div>
  );
}

export function TestimonialMasonryAnimated({
  testimonials,
  style,
  onCardClick,
}: {
  testimonials: EmbedTestimonial[];
  style: EmbedStyle;
  onCardClick?: (testimonialId: string) => void;
}) {
  const [paused, setPaused] = useState(false);
  if (testimonials.length === 0) return null;

  const direction = style.scrollDirection ?? "vertical";
  const duration = SPEED_SECONDS[style.scrollSpeed ?? "normal"];
  const fadeColor = style.backgroundColor || "var(--background)";
  const playState = paused ? "paused" : "running";
  const maxHeight = style.maxHeight ?? DEFAULT_MAX_HEIGHT;

  const card = (t: EmbedTestimonial, key: string) => (
    <TestimonialCard
      key={key}
      testimonial={t}
      style={style}
      onClick={onCardClick ? () => onCardClick(t.id) : undefined}
    />
  );

  if (direction === "horizontal") {
    const rows = Math.min(style.rows ?? 1, testimonials.length) || 1;
    const lanes: EmbedTestimonial[][] = Array.from({ length: rows }, () => []);
    testimonials.forEach((t, i) => lanes[i % rows].push(t));

    return (
      <div
        className="relative overflow-hidden"
        style={{ maxHeight }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="flex flex-col gap-4">
          {lanes.map((lane, i) => (
            <div key={i} className="overflow-hidden">
              <div
                className="flex w-max gap-4"
                style={track(
                  "marquee-horizontal",
                  duration,
                  playState,
                  `-${(i * duration) / (rows + 1)}s`,
                  style.reverseDirection
                )}
              >
                {[0, 1].map((copy) => (
                  <div key={copy} className="flex w-max gap-4">
                    {lane.map((t) => (
                      <div key={`${copy}-${t.id}`} className="w-72 shrink-0">
                        {card(t, `${copy}-${t.id}`)}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <HeartOverlay active={!!style.showHeartAnimation} />
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-12"
          style={{ background: `linear-gradient(to right, ${fadeColor}, transparent)` }}
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-12"
          style={{ background: `linear-gradient(to left, ${fadeColor}, transparent)` }}
        />
      </div>
    );
  }

  const columns = Math.min(style.columns ?? 3, testimonials.length) || 1;
  const buckets: EmbedTestimonial[][] = Array.from({ length: columns }, () => []);
  testimonials.forEach((t, i) => buckets[i % columns].push(t));
  const colsClass =
    columns >= 4
      ? "grid-cols-2 lg:grid-cols-4"
      : columns === 2
        ? "grid-cols-2"
        : columns === 1
          ? "grid-cols-1"
          : "grid-cols-1 sm:grid-cols-3";

  return (
    <div
      className="relative overflow-hidden"
      style={{ maxHeight }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className={`grid gap-4 ${colsClass}`}>
        {buckets.map((bucket, i) => (
          <div key={i} className="overflow-hidden">
            <div
              className="flex flex-col gap-4"
              // Slight per-column offset keeps parallel columns from looking
              // perfectly synchronized, closer to a natural "wall" feel.
              style={track(
                "marquee-vertical",
                duration,
                playState,
                `-${(i * duration) / (columns + 1)}s`,
                style.reverseDirection
              )}
            >
              {[0, 1].map((copy) =>
                bucket.map((t) => card(t, `${copy}-${t.id}`))
              )}
            </div>
          </div>
        ))}
      </div>
      <HeartOverlay active={!!style.showHeartAnimation} />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-12"
        style={{ background: `linear-gradient(to bottom, ${fadeColor}, transparent)` }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-12"
        style={{ background: `linear-gradient(to top, ${fadeColor}, transparent)` }}
      />
    </div>
  );
}
