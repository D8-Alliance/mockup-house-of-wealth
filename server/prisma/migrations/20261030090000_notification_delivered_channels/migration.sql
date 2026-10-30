-- Channels a notification has already been sent on (or skipped), so a retry only repeats the failed ones.
ALTER TABLE "NotificationOutbox" ADD COLUMN "deliveredChannels" TEXT NOT NULL DEFAULT '';
