import { readFileSync } from 'node:fs';

export type EmailProvider = 'resend' | 'smtp';

/**
 * The email provider the settings switch on, or null when email is off. Resend is an HTTPS API
 * (for hosts that block outbound SMTP, such as DigitalOcean droplets); SMTP sends through an
 * organisation's own mail server. Both need NOTIFICATION_EMAIL_FROM.
 */
export function emailProvider(env: NodeJS.ProcessEnv = process.env): EmailProvider | null {
  if (!env.NOTIFICATION_EMAIL_FROM) return null;
  if (env.NOTIFICATION_EMAIL_PROVIDER === 'resend' && env.RESEND_API_KEY) return 'resend';
  if (env.NOTIFICATION_EMAIL_PROVIDER === 'smtp' && env.SMTP_HOST) return 'smtp';
  return null;
}

/** SMTP connection settings. Port 465 (or SMTP_SECURE=true) uses TLS from the start; 587 upgrades with STARTTLS. */
export function smtpOptions(env: NodeJS.ProcessEnv = process.env) {
  const port = Number(env.SMTP_PORT || 587);
  const password = env.SMTP_PASSWORD || (env.SMTP_PASSWORD_FILE ? readFileSync(env.SMTP_PASSWORD_FILE, 'utf8').trim() : undefined);
  return {
    host: env.SMTP_HOST,
    port,
    secure: env.SMTP_SECURE ? env.SMTP_SECURE === 'true' : port === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: password } : undefined,
  };
}
