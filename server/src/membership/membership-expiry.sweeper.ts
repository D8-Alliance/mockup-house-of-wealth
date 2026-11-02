import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { MembershipService } from './membership.service';

const INTERVAL_MS = 24 * 3600_000;

/** Once a day (and two minutes after start): reminds members whose paid plan is ending or has just ended. */
@Injectable()
export class MembershipExpirySweeper implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MembershipExpirySweeper.name);
  private timer?: NodeJS.Timeout;

  constructor(private readonly membership: MembershipService) {}

  onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    this.timer = setInterval(() => void this.tick(), INTERVAL_MS);
    this.timer.unref();
    setTimeout(() => void this.tick(), 120_000).unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async tick() {
    try {
      const due = await this.membership.remindExpiring();
      if (due) this.logger.log(`Membership expiry reminders due: ${due}`);
    } catch (error) {
      this.logger.warn(`Membership expiry check failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
