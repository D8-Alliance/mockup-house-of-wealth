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
