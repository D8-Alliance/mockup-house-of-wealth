import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AgreementSigningService } from './agreement-signing.service';

const INTERVAL_MS = 6 * 3600_000;

/**
 * Every six hours (and shortly after start): seals agreements executed but not yet sealed, asks again for
 * time-stamps that failed, and checks every sealed file still matches its seal and time-stamp.
 */
@Injectable()
export class AgreementIntegritySweeper implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AgreementIntegritySweeper.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(private readonly prisma: PrismaService, private readonly signing: AgreementSigningService) {}

  onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    this.timer = setInterval(() => void this.tick(), INTERVAL_MS);
    this.timer.unref();
    setTimeout(() => void this.tick(), 60_000).unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async tick() {
    if (this.running) return;
    this.running = true;
    try {
      const unsealed = await this.prisma.contract.findMany({ where: { status: 'EXECUTION', engagementId: { not: null }, signedDocument: null }, select: { id: true }, take: 50 });
      for (const contract of unsealed) await this.signing.finalize(contract.id).catch((error) => this.logger.warn(`Agreement ${contract.id} not sealed: ${error instanceof Error ? error.message : String(error)}`));
      const unstamped = await this.prisma.signedAgreementDocument.findMany({ where: { timestampToken: null }, select: { contractId: true }, take: 50 });
      for (const document of unstamped) await this.signing.timestamp(document.contractId);
      const sealed = await this.prisma.signedAgreementDocument.findMany({ select: { contractId: true }, orderBy: { integrityCheckedAt: 'asc' }, take: 200 });
      for (const document of sealed) await this.signing.checkIntegrity(document.contractId);
    } catch (error) {
      this.logger.warn(`Agreement integrity sweep stopped: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      this.running = false;
    }
  }
}
