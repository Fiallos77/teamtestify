// Copy + destination for the Free-tier "out of AI credits" upgrade prompt.
// Kept free of React/JSX imports so it can be unit-tested in the node test
// environment and shared by the alert component below it. The upgrade flow is
// the account settings Plan tab (pricing cards wired to Stripe checkout) —
// there is no standalone /pricing route in the app.
export const AI_QUOTA_LIMIT_MESSAGE =
  "You've reached your AI limit this month. Upgrade to Pro to keep using the AI Assistant and generate unlimited images.";

export const AI_UPGRADE_HREF = "/dashboard/settings?tab=plan";
