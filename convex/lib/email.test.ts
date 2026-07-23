import { afterEach, describe, expect, test, vi } from "vitest";
import {
  buildNewTestimonialEmail,
  buildResetPasswordEmail,
  escapeHtml,
  RESET_PASSWORD_TOKEN_EXPIRES_IN_SECONDS,
  sanitizeEmailSubjectLine,
  sendResetPasswordEmail,
} from "./email";

describe("escapeHtml", () => {
  test("escapes the five HTML-significant characters", () => {
    expect(escapeHtml(`<script>alert(1)</script> & "quoted" 'single'`)).toBe(
      "&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;quoted&quot; &#39;single&#39;"
    );
  });

  test("leaves plain text untouched", () => {
    expect(escapeHtml("Acme Corp Feedback")).toBe("Acme Corp Feedback");
  });
});

describe("sanitizeEmailSubjectLine", () => {
  test("strips carriage returns and newlines", () => {
    expect(sanitizeEmailSubjectLine("Line one\r\nBcc: evil@example.com")).toBe(
      "Line one Bcc: evil@example.com"
    );
  });

  test("leaves a normal single-line subject untouched", () => {
    expect(sanitizeEmailSubjectLine("New testimonial for Acme")).toBe(
      "New testimonial for Acme"
    );
  });
});

describe("buildNewTestimonialEmail", () => {
  test("escapes a malicious space name in the body and keeps the subject single-line", () => {
    const spaceName = "<script>alert(1)</script>\nBcc: evil@example.com";
    const email = buildNewTestimonialEmail({
      spaceName,
      notificationEmail: "owner@example.com",
    });

    expect(email.html).not.toContain("<script>alert(1)</script>");
    expect(email.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(email.subject).not.toMatch(/[\r\n]/);
    expect(email.subject).toBe(
      "New testimonial for <script>alert(1)</script> Bcc: evil@example.com"
    );
  });

  test("sends from the TeamTestify name", () => {
    const email = buildNewTestimonialEmail({
      spaceName: "Acme",
      notificationEmail: "owner@example.com",
    });
    expect(email.from).toBe("TeamTestify <onboarding@resend.dev>");
    expect(email.to).toBe("owner@example.com");
  });
});

describe("buildResetPasswordEmail", () => {
  test("includes the reset link and an expiry notice", () => {
    const email = buildResetPasswordEmail({
      email: "user@example.com",
      url: "https://app.example.com/api/auth/reset-password/abc123?callbackURL=%2Freset-password",
    });
    expect(email.from).toBe("TeamTestify <onboarding@resend.dev>");
    expect(email.to).toBe("user@example.com");
    expect(email.subject).toBe("Reset your TeamTestify password");
    expect(email.html).toContain(
      "https://app.example.com/api/auth/reset-password/abc123?callbackURL=%2Freset-password"
    );
    expect(email.html).toContain("15 minutes");
  });

  test("escapes a hostile url value", () => {
    const email = buildResetPasswordEmail({
      email: "user@example.com",
      url: `https://app.example.com/x"><script>alert(1)</script>`,
    });
    expect(email.html).not.toContain("<script>alert(1)</script>");
    expect(email.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });
});

describe("RESET_PASSWORD_TOKEN_EXPIRES_IN_SECONDS", () => {
  test("is 15 minutes, shorter than Better Auth's 1-hour default", () => {
    expect(RESET_PASSWORD_TOKEN_EXPIRES_IN_SECONDS).toBe(15 * 60);
  });
});

describe("sendResetPasswordEmail", () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.RESEND_API_KEY;
  afterEach(() => {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalKey;
  });

  test("posts the built email to Resend when a key is configured", async () => {
    process.env.RESEND_API_KEY = "re_test";
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await sendResetPasswordEmail("user@example.com", "https://app.example.com/reset/abc");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [reqUrl, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(String(reqUrl)).toBe("https://api.resend.com/emails");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer re_test");
    const body = JSON.parse(init.body as string);
    expect(body.to).toBe("user@example.com");
    expect(body.html).toContain("https://app.example.com/reset/abc");
  });

  test("no-ops without a configured key (fails open, like the testimonial notification email)", async () => {
    delete process.env.RESEND_API_KEY;
    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    await sendResetPasswordEmail("user@example.com", "https://app.example.com/reset/abc");

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
