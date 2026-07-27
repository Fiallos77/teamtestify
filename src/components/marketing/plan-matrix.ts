export type PlanMatrixRow = { label: string; free: string; pro: string };

// Mirrors the Plan Matrix in teamtestify-v2-spec.md — keep in sync with
// convex/entitlements.ts if either changes. See plan-matrix.test.ts.
export const PLAN_MATRIX: PlanMatrixRow[] = [
  { label: "Spaces", free: "3", pro: "5" },
  { label: "Testimonials collected", free: "Unlimited", pro: "Unlimited" },
  { label: "Testimonials published", free: "15 total", pro: "Unlimited" },
  { label: "Video testimonials published", free: "2", pro: "Unlimited" },
  { label: "Max video length", free: "2 min", pro: "3 min" },
  { label: '"Powered by TeamTestify" badge', free: "Yes", pro: "Removable" },
  { label: "Custom domain for collection page", free: "No", pro: "Yes" },
  { label: "Rich snippets (JSON-LD in embed)", free: "No", pro: "Yes" },
  { label: "AI repurposing", free: "No", pro: "100 generations/mo" },
  { label: "Team members", free: "1", pro: "3" },
];
