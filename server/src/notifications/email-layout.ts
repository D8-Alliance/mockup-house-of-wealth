import { EMAIL_LOGO_CID } from './email-logo';
import type { NotificationLanguage } from './notification-language';

/** Platform colours (emerald and dark slate, as on the public pages). */
const ACCENT = '#059669';
const DARK = '#0f172a';
const TEXT = '#334155';
const MUTED = '#64748b';

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);

/** A web address in the text; a full stop, comma or bracket right after it is not part of it. */
const URL_PATTERN = /https?:\/\/[^\s<]+[^\s<.,;:!?)]/g;

/**
 * Escapes the text and puts "the link below" where a web address was, so the address itself is not shown: the
 * button under the text opens it ("open https://… before 1 Dec" reads "open the link below before 1 Dec").
 */
const withoutLinks = (text: string, ms: boolean) => escapeHtml(text.replace(URL_PATTERN, ms ? 'pautan di bawah' : 'the link below'));

/** A button for each different web address in the message, under the text. Built as a table cell so Outlook shows it as a button too. */
const linkButtons = (message: string, ms: boolean) => {
  const urls = [...new Set(message.match(URL_PATTERN) ?? [])];
  return urls.map((url) => `<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:8px auto 18px;"><tr><td align="center" bgcolor="${ACCENT}" style="border-radius:6px;background:${ACCENT};">
<a href="${escapeHtml(url)}" target="_blank" style="display:inline-block;padding:12px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:6px;">${ms ? 'Buka pautan' : 'Open link'}</a>
</td></tr></table>`).join('');
};

/**
 * The HTML version of a platform email: a card with an accent bar, the logo, the subject as a heading, an optional greeting,
 * the message, and a footer. Built with tables and inline styles so it looks the same in Gmail, Outlook and phone
 * mail apps. The plain-text message is still sent alongside it for mail apps that do not show HTML.
 */
/**
 * The HTML version of a platform email: a card with an accent bar, the subject as a heading, an optional greeting,
 * the message, and a footer. Built with tables and inline styles so it looks the same in Gmail, Outlook and phone
 * mail apps. The plain-text message is still sent alongside it for mail apps that do not show HTML.
 */
/** logoSrc is where the logo at the top comes from: by default the PNG sent inside the email (email-logo.ts); a preview can pass a data: address. */
export function renderEmailHtml(input: { title: string; message: string; recipientName?: string; language?: NotificationLanguage; logoSrc?: string }): string {
  const ms = input.language === 'ms';
  const logoSrc = input.logoSrc ?? `cid:${EMAIL_LOGO_CID}`;
  const greeting = input.recipientName ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${TEXT};">${ms ? 'Kepada' : 'Dear'} <strong style="color:${DARK};">${escapeHtml(input.recipientName)}</strong>,</p>` : '';
  const paragraphs = input.message
    .split(/\n\s*\n|\n/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${TEXT};">${withoutLinks(part, ms)}</p>`)
    .join('');
  const footerNote = ms ? 'Emel ini dihantar secara automatik oleh sistem. Sila jangan balas emel ini.' : 'This email was sent automatically by the system. Please do not reply to it.';
  const year = new Date().getFullYear();
  return `<!doctype html>
<html lang="${ms ? 'ms' : 'en'}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(input.title)}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Plus Jakarta Sans','Segoe UI',Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:6px;overflow:hidden;box-shadow:0 1px 4px rgba(15,23,42,0.12);">
<tr><td style="height:8px;background:${ACCENT};font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:28px 32px 8px;text-align:center;">
<img src="${logoSrc}" width="96" height="62" alt="Wealth Pooling" style="display:block;margin:0 auto 18px;width:96px;height:62px;border:0;">
<h1 style="margin:0 0 20px;font-size:22px;line-height:1.35;font-weight:700;color:${DARK};">${escapeHtml(input.title)}</h1>
<div style="height:1px;background:#e2e8f0;margin:0 0 24px;"></div>
</td></tr>
<tr><td style="padding:0 32px 24px;">${greeting}${paragraphs}${linkButtons(input.message, ms)}</td></tr>
<tr><td style="padding:20px 32px;background:${DARK};">
<p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#ffffff;">Wealth Pooling</p>
<p style="margin:0;font-size:12px;line-height:1.5;color:#cbd5e1;">${footerNote}</p>
</td></tr>
</table>
<p style="margin:16px 0 0;font-size:11px;color:${MUTED};text-align:center;">&copy; ${year} Wealth Pooling</p>
</td></tr>
</table>
</body>
</html>`;
}
