import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { CapitalTakafulService } from './capital-takaful.service';

const INTERVAL_MS = 24 * 3600_000;

/** Once a day (and two minutes after start): reminds projects of takaful cover about to end, or ended. */
@Injectable()
export class TakafulExpirySweeper implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TakafulExpirySweeper.name);
  private timer?: NodeJS.Timeout;

  constructor(private readonly safeguards: CapitalTakafulService) {}

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
      const sent = await this.safeguards.remindExpiring();
      if (sent) this.logger.log(`Takaful expiry reminders sent: ${sent}`);
    } catch (error) {
      this.logger.warn(`Takaful expiry check failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
