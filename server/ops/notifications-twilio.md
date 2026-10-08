# Twilio SMS setup

Twilio is optional. Leave `NOTIFICATION_SMS_PROVIDER` empty to keep notifications in-app only.

For SMS delivery, configure these values only in a secret manager or ignored local environment file:

```env
NOTIFICATION_SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+60123456789
```

The sender and recipient must use E.164 format. The Twilio account must be allowed to send to the destination country, and trial accounts may only send to verified recipient numbers. The adapter sends through Twilio's Messages API and fails closed when configuration is missing or malformed.
