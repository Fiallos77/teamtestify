// Destination for the "Upgrade to Pro" button on plan-limit prompts (e.g. the
// space-creation cap). Sends the user to the account settings Plan tab, which
// hosts the pricing cards wired to Stripe checkout. Kept free of React/JSX so
// it can be unit-tested in the node test environment and shared by the alert
// component beside it.
export const PLAN_UPGRADE_HREF = "/dashboard/settings?tab=plan";
