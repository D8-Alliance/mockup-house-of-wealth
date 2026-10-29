import { emailProvider, smtpOptions } from './email-config';

describe('email provider settings', () => {
  it('is off without a sender address or the provider credentials', () => {
    expect(emailProvider({})).toBeNull();
    expect(emailProvider({ NOTIFICATION_EMAIL_PROVIDER: 'smtp', SMTP_HOST: 'mail.example.test' })).toBeNull();
    expect(emailProvider({ NOTIFICATION_EMAIL_PROVIDER: 'resend', NOTIFICATION_EMAIL_FROM: 'noreply@example.test' })).toBeNull();
  });

  it('picks Resend or SMTP from the settings', () => {
    expect(emailProvider({ NOTIFICATION_EMAIL_PROVIDER: 'resend', RESEND_API_KEY: 'key', NOTIFICATION_EMAIL_FROM: 'noreply@example.test' })).toBe('resend');
    expect(emailProvider({ NOTIFICATION_EMAIL_PROVIDER: 'smtp', SMTP_HOST: 'mail.example.test', NOTIFICATION_EMAIL_FROM: 'noreply@example.test' })).toBe('smtp');
  });

  it('uses TLS from the start on port 465 and STARTTLS on 587', () => {
    expect(smtpOptions({ SMTP_HOST: 'mail.example.test', SMTP_PORT: '465' })).toMatchObject({ port: 465, secure: true, auth: undefined });
    expect(smtpOptions({ SMTP_HOST: 'mail.example.test' })).toMatchObject({ port: 587, secure: false });
    expect(smtpOptions({ SMTP_HOST: 'mail.example.test', SMTP_USER: 'noreply', SMTP_PASSWORD: 'pw' }).auth).toEqual({ user: 'noreply', pass: 'pw' });
  });
});
