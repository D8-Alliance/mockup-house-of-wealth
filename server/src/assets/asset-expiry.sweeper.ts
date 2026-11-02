import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { AssetsService } from './assets.service';

const INTERVAL_MS = 24 * 3600_000;

/** Once a day (and two minutes after start): reminds asset owners of road tax, insurance, PUSPAKOM, JKKP and leases expiring. */
@Injectable()
export class AssetExpirySweeper implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AssetExpirySweeper.name);
  private timer?: NodeJS.Timeout;

  constructor(private readonly assets: AssetsService) {}

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
      const due = await this.assets.remindExpiring();
      if (due) this.logger.log(`Asset expiry reminders due: ${due}`);
    } catch (error) {
      this.logger.warn(`Asset expiry check failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
