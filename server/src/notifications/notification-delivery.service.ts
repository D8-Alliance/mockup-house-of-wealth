import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { FcmClient, loadServiceAccount } from './fcm-client';

@Injectable()
export class NotificationDeliveryService {
  async deliver(input: { channels: string; title: string; message: string; recipientEmail?: string; recipientPhone?: string; pushToken?: string }) {
    for (const channel of input.channels.split(',').map((item) => item.trim().toUpperCase()).filter((item) => item && item !== 'IN_APP')) {
      if (channel === 'EMAIL') await this.email(input);
      else if (channel === 'SMS') await this.sms(input);
      else if (channel === 'PUSH') await this.push(input);
      else throw new Error(`Unsupported notification channel: ${channel}`);
    }
  }

  private async email(input: { title: string; message: string; recipientEmail?: string }) {
    // Email is optional while Firebase Push is the active delivery channel.
    if (process.env.NOTIFICATION_EMAIL_PROVIDER !== 'resend' || !process.env.RESEND_API_KEY || !process.env.NOTIFICATION_EMAIL_FROM || !input.recipientEmail) throw new ServiceUnavailableException('Resend email notification is not configured.');
    const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: process.env.NOTIFICATION_EMAIL_FROM, to: [input.recipientEmail], subject: input.title, text: input.message }) });
    if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
  }

  private async sms(input: { title: string; message: string; recipientPhone?: string }) {
    // SMS is optional while Firebase Push is the active delivery channel.
    if (process.env.NOTIFICATION_SMS_PROVIDER !== 'twilio' || !process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_FROM_NUMBER || !input.recipientPhone) throw new ServiceUnavailableException('Twilio SMS notification is not configured.');
    if (!/^AC[A-Za-z0-9]{20,}$/.test(process.env.TWILIO_ACCOUNT_SID) || !/^\+[1-9]\d{7,14}$/.test(process.env.TWILIO_FROM_NUMBER) || !/^\+[1-9]\d{7,14}$/.test(input.recipientPhone)) throw new ServiceUnavailableException('Twilio SMS notification has invalid E.164 or account configuration.');
    const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`, { method: 'POST', headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ From: process.env.TWILIO_FROM_NUMBER, To: input.recipientPhone, Body: `${input.title}: ${input.message}` }) });
    if (!response.ok) throw new Error(`SMS provider returned ${response.status}`);
  }

  private async push(input: { title: string; message: string; pushToken?: string }) {
    const credentialFile = process.env.FCM_SERVICE_ACCOUNT_FILE || process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!input.pushToken) return;
    if (process.env.NOTIFICATION_PUSH_PROVIDER !== 'fcm' || !credentialFile || !input.pushToken) throw new ServiceUnavailableException('Firebase push notification is not configured.');
    await this.fcm(credentialFile).send({ token: input.pushToken, title: input.title, body: input.message });
  }

  // One client per credential file, so the OAuth access token is reused between sends.
  private fcmClient: { file: string; client: FcmClient } | null = null;

  private fcm(file: string): FcmClient {
    if (this.fcmClient?.file !== file) this.fcmClient = { file, client: new FcmClient(loadServiceAccount(file)) };
    return this.fcmClient.client;
  }
}
