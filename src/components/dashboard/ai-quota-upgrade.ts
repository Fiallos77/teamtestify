// Copy + destination for the Free-tier "out of AI credits" upgrade prompt.
// Kept free of React/JSX imports so it can be unit-tested in the node test
// environment and shared by the alert component below it. The upgrade flow is
// the Billing card at /dashboard/settings (which starts Stripe checkout) —
// there is no standalone /pricing route in the app.
export const AI_QUOTA_LIMIT_MESSAGE =
  "Has alcanzado tu límite de IA este mes. Cambiate a Pro para seguir usando el Asistente de IA y generar imágenes ilimitadas.";

export const AI_UPGRADE_HREF = "/dashboard/settings";
