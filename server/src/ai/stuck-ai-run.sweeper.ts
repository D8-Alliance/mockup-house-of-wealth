import { Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { MembershipService } from '../membership/membership.service';
import { NotificationService } from '../notifications/notification.service';
import { PrismaService } from '../prisma.service';

const INTERVAL_MS = 5 * 60_000;

/** The credits taken for a run, saved on it while it runs so they can be returned if it never finishes. */
export interface RunCharge { cost: number; usageTransactionId: string | null; exempt: boolean }

export function chargeOf(output: unknown): RunCharge | null {
  const charge = output && typeof output === 'object' ? (output as { charge?: RunCharge }).charge : undefined;
  return charge && typeof charge.cost === 'number' ? charge : null;
}

/**
 * An AI run left RUNNING after a restart or a crash never reaches the code that refunds a failure, so
 * the user paid for nothing. Runs older than AI_RUN_STUCK_MINUTES (default 15) are marked failed,
 * their credits returned and the user told; evidence left "AI processing" goes back to human review.
 */
@Injectable()
export class StuckAiRunSweeper implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StuckAiRunSweeper.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(private readonly prisma: PrismaService, private readonly membership: MembershipService, @Optional() private readonly notifications?: NotificationService) {}

  onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    this.timer = setInterval(() => void this.tick(), INTERVAL_MS);
    this.timer.unref();
    setTimeout(() => void this.tick(), 30_000).unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async tick() {
    if (this.running) return;
    this.running = true;
    try {
      await this.sweep();
    } catch (error) {
      this.logger.warn(`Stuck AI runs not swept: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      this.running = false;
    }
  }

  async sweep(now = new Date()) {
    const minutes = Number(process.env.AI_RUN_STUCK_MINUTES) || 15;
    const stuck = await this.prisma.aiRun.findMany({ where: { status: 'RUNNING', createdAt: { lt: new Date(now.getTime() - minutes * 60_000) } }, take: 50 });
    let swept = 0;
    for (const run of stuck) {
      const charge = chargeOf(run.output);
      // Claimed atomically, so a second process or a late answer cannot refund twice.
      const claimed = await this.prisma.aiRun.updateMany({ where: { id: run.id, status: 'RUNNING' }, data: { status: 'FAILED', completedAt: now, output: { error: 'Interrupted', reason: `No answer after ${minutes} minutes (server restart or lost connection).`, charge } as object } });
      if (!claimed.count) continue;
      swept += 1;
      let refunded = false;
      if (charge && !charge.exempt && charge.cost > 0) {
        refunded = await this.membership.refundFailedUse({ userId: run.userId, organisationId: run.organisationId }, { ...charge, usageTransactionId: charge.usageTransactionId ?? undefined }, `AIRUN-${run.id}`).then(() => true, (error) => { this.logger.error(`Credit refund for stuck AiRun ${run.id} failed: ${error instanceof Error ? error.message : error}`); return false; });
      }
      if (run.featureKey === 'project_evidence_verification') {
        const documentId = (run.input as { documentId?: string }).documentId;
        if (documentId) await this.prisma.projectEvidenceRequirement.updateMany({ where: { uploadedDocumentId: documentId, status: 'AI_PROCESSING' }, data: { status: 'REQUIRES_REVIEW', verificationStatus: 'REQUIRES_REVIEW' } });
      }
      await this.notifications?.enqueue({
        recipientUserId: run.userId,
        organisationId: run.organisationId,
        countryNodeId: run.countryNodeId,
        type: 'AI_RUN_INTERRUPTED',
        title: 'AI request did not finish',
        message: `Your AI request was interrupted before it answered.${refunded ? ` Your ${charge?.cost} credits were returned.` : ''} Please try again.`,
        resourceType: 'AiRun',
        resourceId: run.id,
        dedupeKey: `ai-run-interrupted:${run.id}`,
      });
    }
    if (swept) this.logger.warn(`Marked ${swept} stuck AI run(s) as failed and returned their credits.`);
    return swept;
  }
}
