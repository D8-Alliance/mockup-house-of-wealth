import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { LeasingService } from './leasing.service';

const INTERVAL_MS = 24 * 3600_000;

/** Once a day (and three minutes after start): rent due and overdue, leases ending, and deposits to refund. */
@Injectable()
export class LeaseReminderSweeper implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LeaseReminderSweeper.name);
  private timer?: NodeJS.Timeout;

  constructor(private readonly leasing: LeasingService) {}

  onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    this.timer = setInterval(() => void this.tick(), INTERVAL_MS);
    this.timer.unref();
    setTimeout(() => void this.tick(), 180_000).unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async tick() {
    try {
      const sent = await this.leasing.remindDue();
      if (sent) this.logger.log(`Lease reminders due: ${sent}`);
    } catch (error) {
      this.logger.warn(`Lease reminder check failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
