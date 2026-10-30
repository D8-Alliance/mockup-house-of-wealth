import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createTransport, Transporter } from 'nodemailer';
import { FcmClient, loadServiceAccount } from './fcm-client';
import { emailProvider, smtpOptions } from './email-config';

type DeliveryInput = { channels: string; title: string; message: string; recipientEmail?: string; recipientPhone?: string; pushToken?: string };

/** What happened on one channel: SKIPPED means it cannot be sent here (not set up, no address), so retrying will not help. */
export interface ChannelResult { channel: string; outcome: 'SENT' | 'SKIPPED' | 'FAILED'; reason?: string }

const outsideChannels = (channels: string) => [...new Set(channels.split(',').map((item) => item.trim().toUpperCase()).filter((item) => item && item !== 'IN_APP'))];

@Injectable()
export class NotificationDeliveryService {
  /** Sends on every channel and throws on the first one that cannot send (used where the message must arrive, e.g. signing codes). */
  async deliver(input: DeliveryInput) {
    for (const channel of outsideChannels(input.channels)) await this.send(channel, input);
  }

  /**
   * Sends on each channel separately, so one channel failing does not stop or repeat the others.
   * A channel that is not set up on this server, or has no address for the recipient, is skipped.
   */
  async deliverEach(input: DeliveryInput): Promise<ChannelResult[]> {
    const results: ChannelResult[] = [];
    for (const channel of outsideChannels(input.channels)) {
      try {
        const sent = await this.send(channel, input);
        results.push(sent ? { channel, outcome: 'SENT' } : { channel, outcome: 'SKIPPED', reason: 'no device registered' });
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        results.push({ channel, outcome: error instanceof ServiceUnavailableException ? 'SKIPPED' : 'FAILED', reason });
      }
    }
    return results;
  }

  /** False when there was nothing to send to (a push without a registered device). */
  private async send(channel: string, input: DeliveryInput): Promise<boolean> {
    if (channel === 'EMAIL') await this.email(input);
    else if (channel === 'SMS') await this.sms(input);
    else if (channel === 'PUSH') return this.push(input);
    else throw new Error(`Unsupported notification channel: ${channel}`);
    return true;
  }

  private async email(input: { title: string; message: string; recipientEmail?: string }) {
    // Email is optional while Firebase Push is the active delivery channel.
    const provider = emailProvider();
    if (!provider || !input.recipientEmail) throw new ServiceUnavailableException('Email notification is not configured.');
    if (provider === 'smtp') {
      await this.smtp().sendMail({ from: process.env.NOTIFICATION_EMAIL_FROM, to: input.recipientEmail, subject: input.title, text: input.message });
      return;
    }
    const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: process.env.NOTIFICATION_EMAIL_FROM, to: [input.recipientEmail], subject: input.title, text: input.message }) });
    if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
  }

  // One pooled SMTP connection, reused between sends.
  private smtpTransport: Transporter | null = null;

  private smtp(): Transporter {
    this.smtpTransport ??= createTransport({ ...smtpOptions(), pool: true });
    return this.smtpTransport;
  }

  private async sms(input: { title: string; message: string; recipientPhone?: string }) {
    // SMS is optional while Firebase Push is the active delivery channel.
    if (process.env.NOTIFICATION_SMS_PROVIDER !== 'twilio' || !process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_FROM_NUMBER || !input.recipientPhone) throw new ServiceUnavailableException('Twilio SMS notification is not configured.');
    if (!/^AC[A-Za-z0-9]{20,}$/.test(process.env.TWILIO_ACCOUNT_SID) || !/^\+[1-9]\d{7,14}$/.test(process.env.TWILIO_FROM_NUMBER) || !/^\+[1-9]\d{7,14}$/.test(input.recipientPhone)) throw new ServiceUnavailableException('Twilio SMS notification has invalid E.164 or account configuration.');
    const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`, { method: 'POST', headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ From: process.env.TWILIO_FROM_NUMBER, To: input.recipientPhone, Body: `${input.title}: ${input.message}` }) });
    if (!response.ok) throw new Error(`SMS provider returned ${response.status}`);
  }

  private async push(input: { title: string; message: string; pushToken?: string }): Promise<boolean> {
    const credentialFile = process.env.FCM_SERVICE_ACCOUNT_FILE || process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!input.pushToken) return false;
    if (process.env.NOTIFICATION_PUSH_PROVIDER !== 'fcm' || !credentialFile || !input.pushToken) throw new ServiceUnavailableException('Firebase push notification is not configured.');
    await this.fcm(credentialFile).send({ token: input.pushToken, title: input.title, body: input.message });
    return true;
  }

  // One client per credential file, so the OAuth access token is reused between sends.
  private fcmClient: { file: string; client: FcmClient } | null = null;

  private fcm(file: string): FcmClient {
    if (this.fcmClient?.file !== file) this.fcmClient = { file, client: new FcmClient(loadServiceAccount(file)) };
    return this.fcmClient.client;
  }
}
