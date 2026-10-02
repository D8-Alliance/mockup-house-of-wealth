import { Injectable, ServiceUnavailableException } from '@nestjs/common';

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
    if (process.env.NOTIFICATION_EMAIL_PROVIDER !== 'resend' || !process.env.RESEND_API_KEY || !process.env.NOTIFICATION_EMAIL_FROM || !input.recipientEmail) throw new ServiceUnavailableException('Resend email notification is not configured.');
    const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: process.env.NOTIFICATION_EMAIL_FROM, to: [input.recipientEmail], subject: input.title, text: input.message }) });
    if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
  }

  private async sms(input: { title: string; message: string; recipientPhone?: string }) {
    if (process.env.NOTIFICATION_SMS_PROVIDER !== 'twilio' || !process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_FROM_NUMBER || !input.recipientPhone) throw new ServiceUnavailableException('Twilio SMS notification is not configured.');
    const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`, { method: 'POST', headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ From: process.env.TWILIO_FROM_NUMBER, To: input.recipientPhone, Body: `${input.title}: ${input.message}` }) });
    if (!response.ok) throw new Error(`SMS provider returned ${response.status}`);
  }

  private async push(input: { title: string; message: string; pushToken?: string }) {
    if (process.env.NOTIFICATION_PUSH_PROVIDER !== 'fcm' || !process.env.FCM_SERVER_KEY || !input.pushToken) throw new ServiceUnavailableException('Firebase push notification is not configured.');
    const response = await fetch('https://fcm.googleapis.com/fcm/send', { method: 'POST', headers: { Authorization: `key=${process.env.FCM_SERVER_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ to: input.pushToken, notification: { title: input.title, body: input.message } }) });
    if (!response.ok) throw new Error(`Push provider returned ${response.status}`);
  }
}
