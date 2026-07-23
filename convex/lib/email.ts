const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

// Email subjects are a single header line — an unescaped \r or \n in a
// user-supplied value (e.g. spaceName) could inject extra headers
// (header injection / "Bcc:" smuggling).
export function sanitizeEmailSubjectLine(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

export function buildNewTestimonialEmail({
  spaceName,
  notificationEmail,
}: {
  spaceName: string;
  notificationEmail: string;
}) {
  return {
    from: "TeamTestify <onboarding@resend.dev>",
    to: notificationEmail,
    subject: sanitizeEmailSubjectLine(`New testimonial for ${spaceName}`),
    html: `<p>You just received a new testimonial for <strong>${escapeHtml(
      spaceName
    )}</strong>.</p><p>Review and approve it from your dashboard.</p>`,
  };
}

// Better Auth's default reset-token lifetime is 1 hour (see
// node_modules/better-auth/dist/api/routes/password.mjs); 15 minutes is a
// tighter window appropriate for a security-sensitive credential reset.
export const RESET_PASSWORD_TOKEN_EXPIRES_IN_SECONDS = 15 * 60;

export function buildResetPasswordEmail({ email, url }: { email: string; url: string }) {
  return {
    from: "TeamTestify <onboarding@resend.dev>",
    to: email,
    subject: "Reset your TeamTestify password",
    html: `<p>Click here to reset your password: <a href="${escapeHtml(url)}">${escapeHtml(
      url
    )}</a></p><p>This link expires in 15 minutes. If you didn't request this, you can safely ignore this email.</p>`,
  };
}

// Called from convex/auth.ts's emailAndPassword.sendResetPassword callback.
// Fails open (no RESEND_API_KEY -> no-op) like sendNewTestimonialEmail in
// convex/notifications.ts, so a missing key in dev never crashes the
// request-password-reset endpoint.
export async function sendResetPasswordEmail(email: string, url: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildResetPasswordEmail({ email, url })),
  });
}
