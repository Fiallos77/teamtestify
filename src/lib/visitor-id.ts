const STORAGE_KEY = "tt_visitor_id";

// A lightweight, non-authoritative identifier for anonymous visitors on the
// public collection page. It only needs to be stable enough to key the
// per-visitor upload rate limit (convex/public.ts) — not to identify a
// person. A cleared localStorage or a second device just gets a fresh
// budget, which is an acceptable trade-off for a rate-limit key, not an
// auth mechanism.
export function getVisitorId(): string {
  if (typeof window === "undefined") return "server";
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const generated =
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `visitor-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(STORAGE_KEY, generated);
    return generated;
  } catch {
    // Storage disabled (private browsing, etc.) — fall back to a
    // per-call id. Worse rate-limit fairness, but never blocks submission.
    return `visitor-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}
