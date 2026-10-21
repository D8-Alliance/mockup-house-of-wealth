import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { NotificationService } from './notification.service';

const INTERVAL_MS = 30_000;

/**
 * Turns queued notifications into in-app notifications when no worker runs (WORKER_ENABLED is not
 * "true", as on staging). With a worker, its repeating "notification-outbox" job does this instead.
 * Rows are claimed atomically, so a stray second process cannot deliver one twice.
 */
@Injectable()
export class NotificationOutboxPoller implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationOutboxPoller.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(private readonly notifications: NotificationService) {}

  onModuleInit() {
    if (process.env.WORKER_ENABLED === 'true' || process.env.NODE_ENV === 'test') return;
    this.timer = setInterval(() => void this.tick(), INTERVAL_MS);
    this.timer.unref();
    this.logger.log('No worker: the API delivers queued notifications every 30 seconds.');
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async tick() {
    if (this.running) return;
    this.running = true;
    try {
      await this.notifications.processOutbox();
    } catch (error) {
      this.logger.warn(`Notification outbox not processed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      this.running = false;
    }
  }
}
