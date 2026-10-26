import { describe, expect, it } from "vitest";
import { renderNotificationEmail } from "@/lib/notificationEmail";
import type { EmailContent } from "@/lib/notificationTypes";

const content: EmailContent = {
  subject: "Your FlagOS update",
  title: "A season update",
  preheader: "Review the latest information.",
  paragraphs: ["One <script>alert('x')</script> & two"],
  sections: [{ title: "Next steps", items: ["Review & confirm"], empty: "Nothing to do." }],
  action: { label: "Open your league", path: "/league/test?from=email&tab=rules" },
};

describe("branded notification emails", () => {
  it("renders branded responsive HTML and a complete plain-text alternative", () => {
    const { html, text } = renderNotificationEmail(content);
    expect(html).toContain("flagos-emblem-v2-512.png");
    expect(html).toContain('name="viewport"');
    expect(html).toContain("https://flagos.ca/league/test?from=email&amp;tab=rules");
    expect(text).toContain("https://flagos.ca/league/test?from=email&tab=rules");
    expect(text).toContain("Review & confirm");
    expect(text).toContain("operational email, not a marketing message");
    expect(html).not.toContain("/privacy");
  });

  it("escapes untrusted names and content rather than rendering arbitrary HTML", () => {
    const { html } = renderNotificationEmail(content);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("Review &amp; confirm");
  });

  it.each(["https://example.com", "//example.com", "/\\evil", "/foo\nbar", "javascript:alert(1)"])("rejects unsafe action URL %s", (path) => {
    expect(() => renderNotificationEmail({ ...content, action: { label: "Go", path } })).toThrow("paths on flagos.ca");
  });

  it("rejects email header injection", () => {
    expect(() => renderNotificationEmail({ ...content, subject: "Update\r\nBcc: victim@example.com" })).toThrow("subject is invalid");
  });
});
