import type { EmailContent } from "@/lib/notificationTypes";

export const NOTIFICATION_SITE_URL = "https://flagos.ca";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] as string);
}

export function renderNotificationEmail(content: EmailContent): { html: string; text: string } {
  if (!content.action.path.startsWith("/") || content.action.path.startsWith("//") || /[\s\\]/.test(content.action.path)) {
    throw new Error("Notification links must be paths on flagos.ca.");
  }
  if (!content.subject.trim() || /[\r\n]/.test(content.subject) || content.subject.length > 200) {
    throw new Error("Notification subject is invalid.");
  }
  const url = new URL(content.action.path, NOTIFICATION_SITE_URL).href;
  const e = escapeHtml;
  const sections = content.sections || [];
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${e(content.subject)}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;color:#0f172a;font-family:Arial,Helvetica,sans-serif">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${e(content.preheader)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #cbd5e1;border-radius:16px">
<tr><td style="padding:24px;border-bottom:1px solid #e2e8f0">
<a href="${NOTIFICATION_SITE_URL}" style="color:#0f172a;text-decoration:none;font-size:28px;font-weight:bold"><img src="${NOTIFICATION_SITE_URL}/flagos-emblem-v2-512.png" width="48" height="48" alt="" style="vertical-align:middle;margin-right:10px;border:0">Flag<span style="color:#287003">OS</span></a>
</td></tr><tr><td style="padding:24px;font-size:16px;line-height:1.65">
<h1 style="margin:0 0 16px;font-size:24px;line-height:1.3">${e(content.title)}</h1>
${content.paragraphs.map((paragraph) => `<p style="margin:0 0 16px">${e(paragraph)}</p>`).join("")}
${sections.map((section) => `<h2 style="margin:24px 0 8px;font-size:18px">${e(section.title)} (${section.items.length})</h2>${section.items.length ? `<ul style="padding-left:22px">${section.items.map((item) => `<li style="margin-bottom:8px">${e(item)}</li>`).join("")}</ul>` : `<p style="color:#475569">${e(section.empty)}</p>`}`).join("")}
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0"><tr><td bgcolor="#1e40af" style="border-radius:8px"><a href="${e(url)}" style="display:inline-block;padding:14px 22px;font-weight:bold;color:#ffffff;text-decoration:none">${e(content.action.label)}</a></td></tr></table>
<p style="font-size:14px;color:#475569;overflow-wrap:anywhere">If the button does not work, open:<br><a href="${e(url)}" style="color:#1e40af;word-break:break-all">${e(url)}</a></p>
</td></tr><tr><td style="padding:20px 24px;border-top:1px solid #e2e8f0;font-size:13px;line-height:1.6;color:#475569">
FlagOS &middot; Tools for the people running the game.<br>
This is an operational email, not a marketing message. For help, reply to this email.<br>
<a href="${NOTIFICATION_SITE_URL}" style="color:#1e40af">flagos.ca</a>
</td></tr></table></td></tr></table></body></html>`;
  const text = [
    "FlagOS", content.title, ...content.paragraphs,
    ...sections.flatMap((section) => [section.title, ...(section.items.length ? section.items.map((item) => `- ${item}`) : [section.empty])]),
    `${content.action.label}: ${url}`,
    "This is an operational email, not a marketing message. For help, reply to this email.",
    NOTIFICATION_SITE_URL,
  ].join("\n\n");
  return { html, text };
}
