"use client";

import { useEffect, useRef, useState } from "react";
import { TestimonialCard } from "./testimonial-card";
import type { EmbedStyle, EmbedTestimonial } from "./types";

export function TestimonialCarousel({
  testimonials,
  style,
  onActiveChange,
}: {
  testimonials: EmbedTestimonial[];
  style: EmbedStyle;
  onActiveChange?: (testimonialId: string) => void;
}) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    onActiveChange?.(testimonials[index]?.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  useEffect(() => {
    if (!style.autoplaySeconds || testimonials.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % testimonials.length);
    }, style.autoplaySeconds * 1000);
    return () => clearInterval(id);
  }, [style.autoplaySeconds, testimonials.length]);

  function handlePointerDown(e: React.PointerEvent) {
    touchStartX.current = e.clientX;
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (touchStartX.current === null) return;
    const delta = e.clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 40) return;
    if (delta > 0) {
      setIndex((i) => (i - 1 + testimonials.length) % testimonials.length);
    } else {
      setIndex((i) => (i + 1) % testimonials.length);
    }
  }

  const current = testimonials[index];
  if (!current) return null;

  return (
    <div className="mx-auto max-w-lg">
      <div onPointerDown={handlePointerDown} onPointerUp={handlePointerUp} className="touch-pan-y">
        <TestimonialCard testimonial={current} style={style} fixedSize />
      </div>
      {testimonials.length > 1 && (
        <div className="mt-3 flex justify-center gap-2">
          {testimonials.map((t, i) => (
            <button
              key={t.id}
              aria-label={`Go to testimonial ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`size-2 rounded-full ${i === index ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
