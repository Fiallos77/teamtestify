// Pure formatting helpers for the plan usage card, kept free of React/JSX so
// they can be unit-tested in the node test environment. A null limit means the
// plan grants unlimited usage (Pro's published testimonials).

export function formatLimit(limit: number | null): string {
  return limit === null ? "Unlimited" : String(limit);
}

// The "X / Y" figure shown next to each metered resource.
export function formatUsage(used: number, limit: number | null): string {
  return `${used} / ${formatLimit(limit)}`;
}

// A resource is "at the cap" when it has a finite limit and usage has reached
// it — used to tint the figure so a maxed-out resource reads as needing an
// upgrade. Unlimited resources are never at the cap.
export function isAtLimit(used: number, limit: number | null): boolean {
  return limit !== null && used >= limit;
}
