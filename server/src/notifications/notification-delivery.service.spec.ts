import { ServiceUnavailableException } from '@nestjs/common';
import { NotificationDeliveryService } from './notification-delivery.service';

describe('NotificationDeliveryService Twilio SMS', () => {
  const original = { provider: process.env.NOTIFICATION_SMS_PROVIDER, sid: process.env.TWILIO_ACCOUNT_SID, token: process.env.TWILIO_AUTH_TOKEN, from: process.env.TWILIO_FROM_NUMBER };
  let fetchMock: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    process.env.NOTIFICATION_SMS_PROVIDER = 'twilio';
    process.env.TWILIO_ACCOUNT_SID = 'AC12345678901234567890123456789012';
    process.env.TWILIO_AUTH_TOKEN = 'test-token';
    process.env.TWILIO_FROM_NUMBER = '+60123456789';
    fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', { status: 201 }));
  });

  afterEach(() => {
    fetchMock.mockRestore();
    if (original.provider === undefined) delete process.env.NOTIFICATION_SMS_PROVIDER; else process.env.NOTIFICATION_SMS_PROVIDER = original.provider;
    if (original.sid === undefined) delete process.env.TWILIO_ACCOUNT_SID; else process.env.TWILIO_ACCOUNT_SID = original.sid;
    if (original.token === undefined) delete process.env.TWILIO_AUTH_TOKEN; else process.env.TWILIO_AUTH_TOKEN = original.token;
    if (original.from === undefined) delete process.env.TWILIO_FROM_NUMBER; else process.env.TWILIO_FROM_NUMBER = original.from;
  });

  it('sends an E.164 SMS through Twilio', async () => {
    await new NotificationDeliveryService().deliver({ channels: 'SMS', title: 'Test', message: 'Hello', recipientPhone: '+60129876543' });
    expect(fetchMock).toHaveBeenCalledWith('https://api.twilio.com/2010-04-01/Accounts/AC12345678901234567890123456789012/Messages.json', expect.objectContaining({ method: 'POST' }));
  });

  it('fails closed for invalid phone configuration', async () => {
    await expect(new NotificationDeliveryService().deliver({ channels: 'SMS', title: 'Test', message: 'Hello', recipientPhone: '0123456789' })).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps in-app delivery successful when a recipient has no push token', async () => {
    await expect(new NotificationDeliveryService().deliver({ channels: 'IN_APP,PUSH', title: 'Test', message: 'Hello' })).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('NotificationDeliveryService email attachment', () => {
  const keys = ['NOTIFICATION_EMAIL_PROVIDER', 'RESEND_API_KEY', 'NOTIFICATION_EMAIL_FROM'] as const;
  const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  let fetchMock: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    process.env.NOTIFICATION_EMAIL_PROVIDER = 'resend';
    process.env.RESEND_API_KEY = 'test-key';
    process.env.NOTIFICATION_EMAIL_FROM = 'noreply@notify.example.test';
    fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
  });

  afterEach(() => {
    fetchMock.mockRestore();
    for (const key of keys) if (original[key] === undefined) delete process.env[key]; else process.env[key] = original[key];
  });

  it('sends the file with a Resend email, base64-encoded', async () => {
    const content = Buffer.from('%PDF-1.7 statement');
    await new NotificationDeliveryService().deliverEach({ channels: 'IN_APP,EMAIL', title: 'Statement of account 2026-12', message: 'Ready.', recipientEmail: 'tenant@example.test', attachment: { filename: 'LEASE-1-statement-2026-12.pdf', content } });
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body.attachments).toEqual([{ filename: 'LEASE-1-statement-2026-12.pdf', content: content.toString('base64') }]);
  });

  it('sends a plain email when there is no file', async () => {
    await new NotificationDeliveryService().deliverEach({ channels: 'EMAIL', title: 'Hello', message: 'Body', recipientEmail: 'tenant@example.test' });
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body)).attachments).toBeUndefined();
  });
});
