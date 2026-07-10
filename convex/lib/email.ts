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
