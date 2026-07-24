"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { TestimonialGrid } from "@/components/embed/testimonial-grid";
import { TestimonialMasonry } from "@/components/embed/testimonial-masonry";
import { TestimonialMasonryAnimated } from "@/components/embed/testimonial-masonry-animated";
import { TestimonialCarousel } from "@/components/embed/testimonial-carousel";
import { SingleTestimonial } from "@/components/embed/single-testimonial";

export function WidgetEmbed({ widgetId }: { widgetId: string }) {
  const payload = useQuery(api.embedPublic.getWidgetPayload, {
    widgetId: widgetId as Id<"widgets">,
  });
  const logEvent = useMutation(api.embed.logEvent);
  const rootRef = useRef<HTMLDivElement>(null);
  const [isDark, setIsDark] = useState(false);
  // window.top throws/differs across origins when actually framed, so the
  // safe check is whether this window has no parent frame — true only when
  // someone opened the URL directly rather than dropping it into a page.
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setIsStandalone(window.self === window.top);
  }, []);

  useEffect(() => {
    if (isStandalone && payload?.name) {
      document.title = payload.name;
    }
  }, [isStandalone, payload?.name]);

  useEffect(() => {
    if (!payload) return;
    if (payload.style.theme === "dark") {
      setIsDark(true);
      return;
    }
    if (payload.style.theme === "light") {
      setIsDark(false);
      return;
    }
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDark(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [payload]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const postHeight = () =>
      window.parent.postMessage(
        { source: "testimonial-widget-resize", widgetId, height: el.scrollHeight },
        "*"
      );
    const observer = new ResizeObserver(postHeight);
    observer.observe(el);
    postHeight();
    return () => observer.disconnect();
  }, [widgetId]);

  useEffect(() => {
    if (payload && payload.testimonials.length > 0) {
      logEvent({ widgetId, type: "impression" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload !== undefined]);

  if (payload === undefined) {
    return <div ref={rootRef} />;
  }

  const accentStyle = payload?.style.accentColor
    ? ({ "--primary": payload.style.accentColor } as React.CSSProperties)
    : undefined;

  const content =
    !payload || payload.testimonials.length === 0 ? (
      <div className="p-6 text-center text-sm text-muted-foreground">
        No testimonials to show yet.
      </div>
    ) : payload.type === "single" ? (
      <SingleTestimonial testimonial={payload.testimonials[0]} style={payload.style} />
    ) : payload.style.layout === "masonry" ? (
      <TestimonialMasonry
        testimonials={payload.testimonials}
        style={payload.style}
        onCardClick={(id) => logEvent({ widgetId, type: "click", testimonialId: id })}
      />
    ) : payload.style.layout === "masonry-animated" ? (
      <TestimonialMasonryAnimated
        testimonials={payload.testimonials}
        style={payload.style}
        onCardClick={(id) => logEvent({ widgetId, type: "click", testimonialId: id })}
      />
    ) : payload.style.layout === "carousel" ? (
      <TestimonialCarousel
        testimonials={payload.testimonials}
        style={payload.style}
        onActiveChange={(id) =>
          id && logEvent({ widgetId, type: "impression", testimonialId: id })
        }
      />
    ) : (
      <TestimonialGrid
        testimonials={payload.testimonials}
        style={payload.style}
        onCardClick={(id) => logEvent({ widgetId, type: "click", testimonialId: id })}
      />
    );

  // A bounded, internally-scrolling box keeps the widget from growing the
  // host page indefinitely as testimonials pile up — the iframe reports a
  // fixed height in this case instead of the full (unbounded) content height.
  // "masonry-animated" bounds itself internally (its ticker viewport can't
  // have a scrollbar), so it's excluded here.
  const isScrollable =
    payload?.type === "wall" &&
    payload.style.layout !== "carousel" &&
    payload.style.layout !== "masonry-animated" &&
    payload.style.maxHeight;

  const containerStyle: React.CSSProperties = {
    ...(payload?.style.backgroundColor ? { backgroundColor: payload.style.backgroundColor } : {}),
  };

  const widget = (
    <div ref={rootRef} className={isDark ? "dark" : ""} style={accentStyle}>
      <div className="bg-background p-4 text-foreground" style={containerStyle}>
        {isScrollable ? (
          <div
            style={{ maxHeight: payload!.style.maxHeight, overflowY: "auto" }}
            className="pr-1"
          >
            {content}
          </div>
        ) : (
          content
        )}
      </div>
    </div>
  );

  // Someone can open this URL directly (not just drop it in an iframe) —
  // give that case real page chrome instead of a bare, unstyled component.
  if (isStandalone) {
    return (
      <div className={`flex min-h-screen justify-center bg-background p-6 ${isDark ? "dark" : ""}`}>
        <div className="w-full max-w-3xl">{widget}</div>
      </div>
    );
  }

  return widget;
}
