-- A file sent with a notification email (e.g. the monthly statement of account PDF), cleared once sent.
ALTER TABLE "NotificationOutbox" ADD COLUMN "attachmentName" TEXT,
  ADD COLUMN "attachment" BYTEA;
