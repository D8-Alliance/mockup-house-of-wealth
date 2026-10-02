import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, Queue, Worker } from 'bullmq';
import { readFileSync } from 'node:fs';
import { DistributionService } from '../distribution/distribution.service';
import { MembershipService } from '../membership/membership.service';
import { PrismaService } from '../prisma.service';
import { NotificationService } from '../notifications/notification.service';
import { AuthenticatedUser } from '../auth/identity.service';

export const HOUSE_OF_WEALTH_QUEUE = 'house-of-wealth-background';

@Injectable()
export class JobQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobQueueService.name);
  private readonly connection = { host: process.env.REDIS_HOST || '127.0.0.1', port: Number(process.env.REDIS_PORT || 6379), password: process.env.REDIS_PASSWORD || (process.env.REDIS_PASSWORD_FILE ? readFileSync(process.env.REDIS_PASSWORD_FILE, 'utf8').trim() : undefined), ...(process.env.REDIS_TLS === 'true' ? { tls: { ca: process.env.REDIS_CA_CERT_FILE ? readFileSync(process.env.REDIS_CA_CERT_FILE) : undefined } } : {}) };
  private queue?: Queue;
  private worker?: Worker;

  constructor(private readonly prisma: PrismaService, private readonly membership: MembershipService, private readonly distributions: DistributionService, private readonly notifications: NotificationService) {}

  async onModuleInit() {
    if (process.env.WORKER_ENABLED !== 'true') return;
    const queue = this.getQueue();
    await queue.add('payment-reconciliation', {}, { repeat: { every: 10 * 60 * 1000 }, jobId: 'payment-reconciliation-schedule' } as any);
    await queue.add('payout-reconciliation', {}, { repeat: { every: 15 * 60 * 1000 }, jobId: 'payout-reconciliation-schedule' } as any);
    await queue.add('notification-outbox', {}, { repeat: { every: 30 * 1000 }, jobId: 'notification-outbox-schedule' } as any);
    this.worker = new Worker(HOUSE_OF_WEALTH_QUEUE, (job) => this.process(job), { connection: this.connection, concurrency: Number(process.env.WORKER_CONCURRENCY || 2) });
    this.worker.on('failed', (job, error) => this.logger.error(`Background job ${job?.name} failed: ${error.message}`));
    this.logger.log('Background worker enabled.');
  }

  async enqueue(name: string, data: Record<string, unknown> = {}, jobId?: string) {
    return this.getQueue().add(name, data, { jobId, attempts: 5, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: 100, removeOnFail: 500 } as any);
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
  }

  private getQueue() {
    return this.queue ??= new Queue(HOUSE_OF_WEALTH_QUEUE, { connection: this.connection });
  }

  private async process(job: Job) {
    const bucket = Math.floor(Date.now() / (job.name === 'notification-outbox' ? 30_000 : 5 * 60_000));
    const idempotencyKey = `${job.name}:${bucket}`;
    const existing = await this.prisma.jobRun.findUnique({ where: { idempotencyKey } });
    if (existing?.status === 'SUCCEEDED') return existing;
    const run = existing || await this.prisma.jobRun.create({ data: { jobName: job.name, idempotencyKey, attempts: job.attemptsMade + 1 } });
    const actor = this.systemActor();
    try {
      let metadata: unknown;
      if (job.name === 'payment-reconciliation') metadata = await this.membership.reconcileOpenPayments(actor);
      else if (job.name === 'payout-reconciliation') metadata = await this.distributions.reconcilePayouts(actor);
      else if (job.name === 'notification-outbox') metadata = await this.notifications.processOutbox();
      else throw new Error(`Unknown background job: ${job.name}`);
      return this.prisma.jobRun.update({ where: { id: run.id }, data: { status: 'SUCCEEDED', finishedAt: new Date(), metadata: metadata as any, lastError: null } });
    } catch (error) {
      await this.prisma.jobRun.update({ where: { id: run.id }, data: { status: 'FAILED', finishedAt: new Date(), lastError: error instanceof Error ? error.message : String(error) } });
      throw error;
    }
  }

  private systemActor(): AuthenticatedUser {
    return { userId: 'SYSTEM-BACKGROUND-WORKER', idpSubjectId: 'SYSTEM-BACKGROUND-WORKER', email: 'background-worker@internal', name: 'Background Worker', role: 'Super Admin', countryNodeId: process.env.DEFAULT_COUNTRY_NODE || 'CN-MYS', organisationId: process.env.DEFAULT_ORGANISATION || 'ORG-PUBLIC', assignedRoles: ['Super Admin'] };
  }
}
