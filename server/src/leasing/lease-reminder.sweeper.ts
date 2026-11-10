import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { LeasingService } from './leasing.service';
import { RentCollectionService } from './rent-collection.service';

const INTERVAL_MS = 24 * 3600_000;

/** Once a day (and three minutes after start): rent due and overdue, leases ending, deposits to refund, rent collection cases and the monthly statements of account. */
@Injectable()
export class LeaseReminderSweeper implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LeaseReminderSweeper.name);
  private timer?: NodeJS.Timeout;

  constructor(private readonly leasing: LeasingService, private readonly collection: RentCollectionService) {}

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
      const cases = await this.collection.sweep();
      if (cases) this.logger.log(`Rent collection cases opened or closed: ${cases}`);
      const statements = await this.leasing.sendMonthlyStatements();
      if (statements) this.logger.log(`Monthly statements of account sent: ${statements}`);
    } catch (error) {
      this.logger.warn(`Lease reminder check failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
