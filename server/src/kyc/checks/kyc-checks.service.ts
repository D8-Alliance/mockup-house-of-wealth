import { BadRequestException, Inject, Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../../audit/audit.service';
import { AuthenticatedUser } from '../../auth/identity.service';
import { PrismaService } from '../../prisma.service';
import { assertRoutingUsable, CheckRoute, CheckRouting, loadCheckRouting, resolvePipeline } from './check-routing';
import { CheckContext, CheckOutcome, CheckSubject, FINAL_CHECK_STATUSES, KYC_CHECK_PROVIDERS, KYC_CHECK_TYPES, KycCheckProvider, KycCheckStatus, KycCheckType, WebhookRequest } from './check-types';
import { recommend } from './recommendation';

export const KYC_CHECK_ROUTING = Symbol('KYC_CHECK_ROUTING');
const SYSTEM_ACTOR = 'system:kyc-checks';
const DEFAULT_TIMEOUT_MS = 30_000;

// Everything except the raw provider response, which holds personal data.
export const CHECK_RESULT_SELECT = { id: true, round: true, checkType: true, provider: true, providerVersion: true, status: true, score: true, reasons: true, identity: true, shadow: true, agree: true, latencyMs: true, createdAt: true, completedAt: true } satisfies Prisma.KycCheckResultSelect;

const isFinal = (status: string) => (FINAL_CHECK_STATUSES as string[]).includes(status);

/**
 * Runs the automated KYC checks for an application and keeps an advisory
 * recommendation on it. It never changes the application's status: approval
 * stays with a KYC officer (KycService.review). Each run is a new "round", so
 * re-running for an approved user (e.g. after a registry becomes available)
 * adds evidence without revoking their verification.
 */
@Injectable()
export class KycChecksService {
  private readonly logger = new Logger('KycChecks');
  private readonly providers: Map<string, KycCheckProvider>;
  private readonly routing: CheckRouting;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(KYC_CHECK_PROVIDERS) providers: KycCheckProvider[],
    @Optional() @Inject(KYC_CHECK_ROUTING) routing?: CheckRouting,
  ) {
    this.routing = routing ?? loadCheckRouting();
    assertRoutingUsable(this.routing, providers);
    this.providers = new Map(providers.map((provider) => [provider.name, provider]));
  }

  /** Runs every routed check as a new round, then refreshes the recommendation. Shadow runs finish before it resolves. */
  async run(applicationId: string, trigger: { reason: 'SUBMITTED' | 'OFFICER_RERUN'; actor?: AuthenticatedUser }) {
    const application = await this.prisma.kycApplication.findUnique({ where: { id: applicationId }, include: { documents: { select: { documentType: true } } } });
    if (!application) throw new NotFoundException('KYC application not found');
    const pipeline = resolvePipeline(this.routing, application.countryNodeId);
    const checks = KYC_CHECK_TYPES.filter((check) => pipeline[check]);
    if (!checks.length) return;

    const last = await this.prisma.kycCheckResult.aggregate({ where: { applicationId }, _max: { round: true } });
    const round = (last._max.round ?? 0) + 1;
    await this.prisma.kycApplication.update({ where: { id: applicationId }, data: { checkRecommendation: 'PENDING', checksUpdatedAt: new Date() } });

    const subject: CheckSubject = {
      applicationId,
      userId: application.userId,
      countryNodeId: application.countryNodeId,
      fullName: application.fullName,
      dateOfBirth: application.dateOfBirth,
      nationality: application.nationality,
      idDocumentType: application.idDocumentType,
      idDocumentNumber: application.idDocumentNumber,
      idDocumentExpiry: application.idDocumentExpiry,
      documentTypes: application.documents.map((document) => document.documentType),
      loadDocument: async (documentType) => {
        const document = await this.prisma.kycDocument.findUnique({ where: { applicationId_documentType: { applicationId, documentType } }, select: { mimeType: true, fileContent: true } });
        return document && { mimeType: document.mimeType, content: Buffer.from(document.fileContent) };
      },
    };

    const previous: CheckContext['previous'] = {};
    const shadows: Promise<void>[] = [];
    for (const check of checks) {
      const route = pipeline[check]!;
      const context = { subject, previous: { ...previous } };
      const { provider, version, outcome, latencyMs } = await this.runWithFallback(check, route, context);
      await this.saveResult(applicationId, round, check, provider, version, outcome, latencyMs, false);
      if (isFinal(outcome.status)) previous[check] = outcome;
      for (const name of route.shadow ?? []) shadows.push(this.runShadow(name, applicationId, round, check, route, context));
    }

    const recommendation = await this.refreshRecommendation(applicationId);
    const actor = trigger.actor;
    await this.audit.record({
      userId: actor?.userId ?? SYSTEM_ACTOR,
      userEmail: actor?.email,
      action: 'kyc.checks.run',
      resourceType: 'KycApplication',
      resourceId: applicationId,
      organisationId: application.organisationId,
      countryNodeId: application.countryNodeId,
      metadata: { round, reason: trigger.reason, checks, recommendation },
    });
    await Promise.allSettled(shadows);
  }

  /**
   * Applies an async provider result. The provider authenticates the request
   * (signature and timestamp); the transaction id must then match a PENDING
   * check exactly, and each check accepts one result, so replays are ignored.
   */
  async applyWebhook(providerName: string, request: WebhookRequest): Promise<{ applied: boolean }> {
    const provider = this.providers.get(providerName);
    if (!provider?.parseWebhook) throw new NotFoundException('Unknown webhook provider');
    const { externalRef, outcome } = await provider.parseWebhook(request);
    const row = await this.prisma.kycCheckResult.findUnique({ where: { provider_externalRef: { provider: providerName, externalRef } } });
    if (!row) throw new NotFoundException('Unknown provider transaction');
    if (!isFinal(outcome.status)) return { applied: false };

    const updated = await this.prisma.kycCheckResult.updateMany({
      where: { id: row.id, status: 'PENDING' },
      data: { status: outcome.status, score: outcome.score ?? null, reasons: outcome.reasons, identity: (outcome.identity ?? Prisma.JsonNull) as Prisma.InputJsonValue, raw: (outcome.raw ?? Prisma.JsonNull) as Prisma.InputJsonValue, completedAt: new Date() },
    });
    if (!updated.count) return { applied: false };

    await this.recordAgreement(row.applicationId, row.round, row.checkType);
    if (!row.shadow) {
      const latest = await this.prisma.kycCheckResult.aggregate({ where: { applicationId: row.applicationId }, _max: { round: true } });
      if (latest._max.round === row.round) await this.refreshRecommendation(row.applicationId);
    }
    await this.audit.record({ userId: `provider:${providerName}`, action: 'kyc.checks.webhook', resourceType: 'KycCheckResult', resourceId: row.id, metadata: { applicationId: row.applicationId, checkType: row.checkType, status: outcome.status, shadow: row.shadow } });
    return { applied: true };
  }

  /** Check results for an application, newest round first (raw responses excluded). */
  listResults(applicationId: string) {
    return this.prisma.kycCheckResult.findMany({ where: { applicationId }, orderBy: [{ round: 'desc' }, { createdAt: 'asc' }], select: CHECK_RESULT_SELECT });
  }

  // ---- internals -------------------------------------------------------------

  private async runWithFallback(check: KycCheckType, route: CheckRoute, context: Omit<CheckContext, 'signal'>) {
    const errors: string[] = [];
    for (const name of [route.primary, ...(route.fallback ?? [])]) {
      const provider = this.providers.get(name);
      if (!provider?.supports(check, context.subject.countryNodeId)) {
        errors.push(`${name}: does not support ${check} for ${context.subject.countryNodeId}`);
        continue;
      }
      const started = Date.now();
      try {
        const outcome = await this.callWithTimeout(provider, check, context, route.timeoutMs ?? DEFAULT_TIMEOUT_MS);
        if (outcome.status !== 'ERROR') return { provider: provider.name, version: provider.version, outcome, latencyMs: Date.now() - started };
        errors.push(`${name}: ${outcome.reasons.join('; ') || 'error'}`);
      } catch (error) {
        errors.push(`${name}: ${(error as Error).message}`);
        this.logger.warn(`Provider ${name} failed ${check}: ${(error as Error).message}`);
      }
    }
    return { provider: 'none', version: '-', outcome: { status: 'ERROR' as KycCheckStatus, reasons: errors }, latencyMs: 0 };
  }

  /** Aborts the provider call on timeout (not just stops waiting), so a late vendor run cannot double-charge. */
  private async callWithTimeout(provider: KycCheckProvider, check: KycCheckType, context: Omit<CheckContext, 'signal'>, timeoutMs: number): Promise<CheckOutcome> {
    const controller = new AbortController();
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        // Reject before aborting: a provider that settles on abort must not win the race.
        reject(new Error(`timed out after ${timeoutMs}ms`));
        controller.abort();
      }, timeoutMs);
    });
    try {
      const outcome = await Promise.race([provider.run(check, { ...context, signal: controller.signal }), timeout]);
      if (controller.signal.aborted) throw new Error(`timed out after ${timeoutMs}ms`);
      // An async result is only usable if the webhook can be matched to it.
      if (outcome.status === 'PENDING' && !outcome.externalRef) return { status: 'ERROR', reasons: ['provider returned PENDING without a transaction id'] };
      return outcome;
    } finally {
      clearTimeout(timer);
    }
  }

  private async runShadow(name: string, applicationId: string, round: number, check: KycCheckType, route: CheckRoute, context: Omit<CheckContext, 'signal'>) {
    const provider = this.providers.get(name);
    if (!provider?.supports(check, context.subject.countryNodeId)) return;
    const started = Date.now();
    try {
      const outcome = await this.callWithTimeout(provider, check, context, route.timeoutMs ?? DEFAULT_TIMEOUT_MS);
      await this.saveResult(applicationId, round, check, provider.name, provider.version, outcome, Date.now() - started, true);
      await this.recordAgreement(applicationId, round, check);
    } catch (error) {
      this.logger.warn(`Shadow ${name}/${check} failed: ${(error as Error).message}`);
    }
  }

  private saveResult(applicationId: string, round: number, checkType: KycCheckType, provider: string, providerVersion: string, outcome: CheckOutcome, latencyMs: number, shadow: boolean) {
    return this.prisma.kycCheckResult.create({
      data: {
        applicationId, round, checkType, provider, providerVersion, shadow, latencyMs,
        status: outcome.status,
        score: outcome.score ?? null,
        reasons: outcome.reasons,
        identity: (outcome.identity ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        externalRef: outcome.externalRef ?? null,
        raw: (outcome.raw ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        completedAt: isFinal(outcome.status) ? new Date() : null,
      },
    });
  }

  /**
   * Shadow agreement is decided only once both the primary and the shadow
   * results are final, so an async vendor's initial PENDING never counts as
   * a disagreement.
   */
  private async recordAgreement(applicationId: string, round: number, checkType: string) {
    const primary = await this.prisma.kycCheckResult.findFirst({ where: { applicationId, round, checkType, shadow: false }, orderBy: { createdAt: 'desc' } });
    if (!primary || !isFinal(primary.status)) return;
    const shadows = await this.prisma.kycCheckResult.findMany({ where: { applicationId, round, checkType, shadow: true, agree: null, status: { in: FINAL_CHECK_STATUSES } } });
    for (const shadow of shadows) {
      await this.prisma.kycCheckResult.update({ where: { id: shadow.id }, data: { agree: shadow.status === primary.status } });
    }
  }

  private async refreshRecommendation(applicationId: string) {
    const application = await this.prisma.kycApplication.findUniqueOrThrow({ where: { id: applicationId } });
    const latest = await this.prisma.kycCheckResult.aggregate({ where: { applicationId }, _max: { round: true } });
    const rows = latest._max.round === null ? [] : await this.prisma.kycCheckResult.findMany({ where: { applicationId, round: latest._max.round, shadow: false }, orderBy: { createdAt: 'asc' } });
    const results: Partial<Record<KycCheckType, CheckOutcome>> = {};
    for (const row of rows) {
      results[row.checkType as KycCheckType] = { status: row.status as KycCheckStatus, score: row.score ?? undefined, reasons: row.reasons as string[], identity: (row.identity ?? undefined) as CheckOutcome['identity'] };
    }
    const { recommendation, reasons } = recommend(resolvePipeline(this.routing, application.countryNodeId), results, application);
    await this.prisma.kycApplication.update({ where: { id: applicationId }, data: { checkRecommendation: recommendation, checkReasons: reasons, checksUpdatedAt: new Date() } });
    return recommendation;
  }

  /** Used by the officer re-run endpoint: only for applications that are under review or already approved. */
  assertCanRerun(status: string) {
    if (status !== 'SUBMITTED' && status !== 'APPROVED') throw new BadRequestException('Checks can only be re-run for submitted or approved applications.');
  }
}
