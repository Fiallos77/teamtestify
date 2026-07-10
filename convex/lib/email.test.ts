import { describe, expect, test } from "vitest";
import {
  buildNewTestimonialEmail,
  escapeHtml,
  sanitizeEmailSubjectLine,
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
