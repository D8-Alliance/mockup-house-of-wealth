import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { Prisma, UserRole as PrismaUserRole } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { AssetDetails } from '../assets/asset-checks';
import { ASSET_OWNER_ROLES } from '../assets/assets.service';
import { NotificationService } from '../notifications/notification.service';
import { PrismaService } from '../prisma.service';
import { checkSummary, partnershipChecks, ReviewCheck } from './partnership-review-checks';
import { newCountryScopedId } from '../users/user-identity';
import { AssetListingDto, CreateAssetNeedDto, CreateEngagementDto, RespondEngagementDto, ReviewEngagementDto, UpdateNeedStatusDto, WithdrawEngagementDto } from './asset-partnership.dto';
import { Akad, cleanTerms, CLOSED_PROJECT_STATUSES, EngagementTerms, HOLDING_ENGAGEMENT_STATUSES, offerMetrics, OPEN_ENGAGEMENT_STATUSES, otherParty, Party, periodsOverlap, publicDetails, regionOf, termsProblems, typesMatch, demandLevel, OFFER_SCORE_WEIGHTS, scoreOffers, sameTerms } from './asset-partnership-rules';

/** Roles that act for a delivery partner (PDP) and its projects. */
export const PDP_ROLES: ReadonlySet<string> = new Set(['Project Sponsor', 'Project Manager', 'Organization Admin']);
/** Legal approval: the terms and the right to deal with the asset. */
const LEGAL_REVIEWERS: ReadonlySet<string> = new Set(['Legal Officer', 'Country Admin', 'Super Admin']);
/** Shariah approval: the akad itself. */
const SHARIAH_REVIEWERS: ReadonlySet<string> = new Set(['Shariah Reviewer', 'Shariah Advisor', 'Shariah Committee', 'Super Admin']);
const REVIEWERS: ReadonlySet<string> = new Set([...LEGAL_REVIEWERS, ...SHARIAH_REVIEWERS]);

interface HistoryEntry {
  at: string;
  by: string;
  byName: string;
  party: Party | 'REVIEW';
  action: string;
  note?: string;
  akad?: Akad;
  terms?: EngagementTerms;
  startDate?: string;
  endDate?: string;
  /** Review decisions: the system checks that failed or warned when the reviewer decided. */
  checks?: { fail: string[]; warn: string[] };
}

const ENGAGEMENT_INCLUDE = {
  asset: { select: { id: true, assetType: true, name: true, location: true, titleReference: true, details: true, estimatedValue: true, currency: true, isEncumbered: true, encumbranceNote: true, intendedUse: true, status: true, ownerUserId: true, checkFindings: true, organisation: { select: { name: true } } } },
  project: { select: { projectId: true, projectCode: true, projectName: true, sector: true, status: true, projectSponsorId: true, organisation: { select: { name: true } } } },
  need: { select: { id: true, title: true, quantity: true, createdBy: true } },
} satisfies Prisma.AssetEngagementInclude;
type EngagementRow = Prisma.AssetEngagementGetPayload<{ include: typeof ENGAGEMENT_INCLUDE }>;

/** Offers still in play for a need: under discussion, accepted or approved. */
const LIVE_STATUSES = ['PROPOSED', 'ACCEPTED', 'APPROVED'];
const NEED_TYPE_NAMES: Record<string, string> = { LAND: 'land', BUILDING: 'building', MACHINERY: 'machinery', VEHICLE: 'heavy vehicle', EQUIPMENT: 'equipment', OTHER: 'asset' };

const day = (date: Date | null | undefined) => (date ? date.toISOString().slice(0, 10) : null);

/**
 * Asset partnerships: an asset owner offers a verified asset to a delivery partner's project need,
 * or a delivery partner asks to use an asset its owner has chosen to offer. The two sides negotiate
 * the akad (Ijarah lease or Musharakah partnership) until one accepts; Legal and Shariah then approve,
 * and the asset is held for the agreed period.
 */
@Injectable()
export class AssetPartnershipsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService, @Optional() private readonly notifications?: NotificationService) {}

  // ---- Listing: the owner chooses to offer a verified asset ----

  async setListing(actor: AuthenticatedUser, assetId: string, input: AssetListingDto) {
    if (!ASSET_OWNER_ROLES.has(actor.role)) throw new ForbiddenException('Only the asset owner can offer an asset to delivery partners.');
    const asset = await this.prisma.asset.findFirst({ where: { id: assetId, organisationId: actor.organisationId, countryNodeId: actor.countryNodeId } });
    if (!asset) throw new NotFoundException('Asset not found.');
    if (input.offered && asset.status !== 'VERIFIED') throw new BadRequestException('Only a verified asset can be offered to delivery partners.');
    if (input.availableFrom && input.availableUntil && input.availableUntil <= input.availableFrom) throw new BadRequestException('"Available until" must be after "available from".');
    const offerTerms = { preferredAkad: input.preferredAkad ?? 'EITHER', availableFrom: input.availableFrom ?? null, availableUntil: input.availableUntil ?? null, indicativeTerms: input.indicativeTerms ?? '', note: input.note ?? '' };
    const updated = await this.prisma.asset.update({ where: { id: asset.id }, data: { offeredToPdp: input.offered, offerTerms } });
    await this.audit.recordActor(actor, { action: input.offered ? 'asset.offer_to_pdp' : 'asset.withdraw_offer', resourceType: 'Asset', resourceId: asset.id, organisationId: asset.organisationId, countryNodeId: asset.countryNodeId, metadata: offerTerms });
    return { id: updated.id, offeredToPdp: updated.offeredToPdp, offerTerms: updated.offerTerms };
  }

  /** Verified assets other owners in the country offer, without identifiers or the owner's name. */
  async listedAssets(actor: AuthenticatedUser, assetType?: string) {
    if (!PDP_ROLES.has(actor.role) && !REVIEWERS.has(actor.role)) throw new ForbiddenException('Only delivery partners can browse offered assets.');
    const assets = await this.prisma.asset.findMany({
      where: { countryNodeId: actor.countryNodeId, offeredToPdp: true, status: 'VERIFIED', organisationId: { not: actor.organisationId }, ...(assetType ? { assetType } : {}) },
      orderBy: { updatedAt: 'desc' },
      include: { engagements: { where: { status: 'APPROVED', endDate: { gte: new Date() } }, select: { startDate: true, endDate: true } } },
    });
    return assets.map((asset) => ({
      id: asset.id,
      assetType: asset.assetType,
      name: asset.name,
      region: regionOf(asset.details as AssetDetails | null),
      details: publicDetails(asset.assetType, asset.details as AssetDetails | null),
      intendedUse: asset.intendedUse,
      isEncumbered: asset.isEncumbered,
      offerTerms: asset.offerTerms,
      committed: asset.engagements.map((engagement) => ({ startDate: day(engagement.startDate), endDate: day(engagement.endDate) })),
    }));
  }

  // ---- Needs: a delivery partner says what its project needs ----

  async createNeed(actor: AuthenticatedUser, input: CreateAssetNeedDto) {
    this.assertPdp(actor);
    const project = await this.ownProject(actor, input.projectId);
    if (input.startDate && input.endDate && input.endDate <= input.startDate) throw new BadRequestException('The end date must be after the start date.');
    const need = await this.prisma.projectAssetNeed.create({
      data: {
        id: newCountryScopedId('NEED', actor.countryNodeId), projectId: project.projectId, organisationId: actor.organisationId, countryNodeId: actor.countryNodeId,
        assetType: input.assetType, title: input.title, description: input.description ?? '', quantity: input.quantity,
        startDate: input.startDate ? new Date(input.startDate) : null, endDate: input.endDate ? new Date(input.endDate) : null,
        location: input.location ?? '', preferredAkad: input.preferredAkad ?? 'EITHER', createdBy: actor.userId,
      },
    });
    await this.audit.recordActor(actor, { action: 'asset_need.create', resourceType: 'ProjectAssetNeed', resourceId: need.id, organisationId: need.organisationId, countryNodeId: need.countryNodeId, metadata: { projectId: need.projectId, assetType: need.assetType, quantity: need.quantity } });
    await this.notifyAssetOwnersOfNeed(need);
    return need;
  }

  /** Delivery partners see their own needs; asset owners the open needs of other organisations in the country; reviewers all in the country. */
  async listNeeds(actor: AuthenticatedUser) {
    let where: Prisma.ProjectAssetNeedWhereInput;
    if (actor.role === 'Super Admin') where = {};
    else if (PDP_ROLES.has(actor.role)) where = { organisationId: actor.organisationId, countryNodeId: actor.countryNodeId };
    else if (ASSET_OWNER_ROLES.has(actor.role)) where = { countryNodeId: actor.countryNodeId, status: 'OPEN', organisationId: { not: actor.organisationId } };
    else if (REVIEWERS.has(actor.role)) where = { countryNodeId: actor.countryNodeId };
    else throw new ForbiddenException('Project asset needs are for delivery partners, asset owners and reviewers.');
    const needs = await this.prisma.projectAssetNeed.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        project: { select: { projectCode: true, projectName: true, sector: true, status: true, organisation: { select: { name: true } } } },
        engagements: { select: { id: true, status: true, ownerOrganisationId: true } },
      },
    });
    return needs.map(({ engagements, project, ...need }) => ({
      ...need,
      startDate: day(need.startDate),
      endDate: day(need.endDate),
      project: { projectCode: project.projectCode, projectName: project.projectName, sector: project.sector, status: project.status, organisationName: project.organisation.name },
      approvedCount: engagements.filter((engagement) => engagement.status === 'APPROVED').length,
      // An owner learns only about their own offers; the delivery partner sees how many came in.
      offerCount: ASSET_OWNER_ROLES.has(actor.role) ? undefined : engagements.length,
      myEngagementIds: ASSET_OWNER_ROLES.has(actor.role) ? engagements.filter((engagement) => engagement.ownerOrganisationId === actor.organisationId).map((engagement) => engagement.id) : undefined,
    }));
  }

  async updateNeedStatus(actor: AuthenticatedUser, id: string, input: UpdateNeedStatusDto) {
    this.assertPdp(actor);
    const need = await this.prisma.projectAssetNeed.findFirst({ where: { id, organisationId: actor.organisationId, countryNodeId: actor.countryNodeId } });
    if (!need) throw new NotFoundException('Need not found.');
    const updated = await this.prisma.projectAssetNeed.update({ where: { id }, data: { status: input.status } });
    await this.audit.recordActor(actor, { action: input.status === 'CLOSED' ? 'asset_need.close' : 'asset_need.reopen', resourceType: 'ProjectAssetNeed', resourceId: id, organisationId: need.organisationId, countryNodeId: need.countryNodeId });
    if (input.status === 'CLOSED') await this.closeOpenOffers(id, 'The delivery partner closed this need, so the offer was closed.');
    return updated;
  }

  /**
   * Every offer and request for one need side by side, with figures that make them comparable:
   * rent per month and over the period, the share of the needed period covered, and document issues.
   */
  async compareOffers(actor: AuthenticatedUser, needId: string) {
    const need = await this.prisma.projectAssetNeed.findUnique({ where: { id: needId } });
    const allowed = need && (actor.role === 'Super Admin' || (need.countryNodeId === actor.countryNodeId && ((PDP_ROLES.has(actor.role) && need.organisationId === actor.organisationId) || REVIEWERS.has(actor.role))));
    if (!need || !allowed) throw new NotFoundException('Need not found.');
    const rows = await this.prisma.assetEngagement.findMany({ where: { needId, status: { not: 'WITHDRAWN' } }, orderBy: { createdAt: 'asc' }, include: ENGAGEMENT_INCLUDE });
    const held = rows.filter((row) => HOLDING_ENGAGEMENT_STATUSES.includes(row.status)).length;
    const live = rows.filter((row) => LIVE_STATUSES.includes(row.status));
    // Other projects' open offers for the same assets over overlapping periods. Only a level is shown.
    const competing = live.length ? await this.prisma.assetEngagement.findMany({ where: { assetId: { in: live.map((row) => row.assetId) }, status: { in: OPEN_ENGAGEMENT_STATUSES }, NOT: { needId } }, select: { id: true, assetId: true, projectId: true, startDate: true, endDate: true } }) : [];
    const types = need.assetType === 'MACHINERY' || need.assetType === 'EQUIPMENT' ? ['MACHINERY', 'EQUIPMENT'] : [need.assetType];
    const awaitingVerification = await this.prisma.asset.count({ where: { countryNodeId: need.countryNodeId, assetType: { in: types }, status: { in: ['SUBMITTED', 'CHANGES_REQUESTED'] }, organisationId: { not: need.organisationId } } });
    const offers = rows.map((row) => {
      const findings = Array.isArray(row.asset.checkFindings) ? row.asset.checkFindings as Array<{ result?: string }> : [];
      const others = competing.filter((other) => other.assetId === row.assetId && other.projectId !== row.projectId && periodsOverlap(other, row)).length;
      return {
        ...this.view(actor, row),
        metrics: offerMetrics(row.akad as Akad, row.terms as EngagementTerms, row.startDate, row.endDate, need.startDate, need.endDate),
        documentIssues: findings.filter((finding) => finding.result === 'MISMATCH' || finding.result === 'NOT_FOUND').length,
        demand: demandLevel(others),
        live: LIVE_STATUSES.includes(row.status),
      };
    });
    const scores = scoreOffers(offers.filter((offer) => offer.live).map((offer) => ({ id: offer.id, akad: offer.akad as Akad, monthlyRent: offer.metrics.monthlyRent, profitSharePct: (offer.terms as EngagementTerms).profitSharePct ?? null, coveragePct: offer.metrics.coveragePct, documentIssues: offer.documentIssues, encumbered: offer.asset.isEncumbered, demand: offer.demand })));
    return {
      need: { id: need.id, title: need.title, assetType: need.assetType, quantity: need.quantity, status: need.status, startDate: day(need.startDate), endDate: day(need.endDate), location: need.location, preferredAkad: need.preferredAkad },
      held,
      weights: OFFER_SCORE_WEIGHTS,
      awaitingVerification,
      offers: offers.map((offer) => ({ ...offer, score: scores.get(offer.id) ?? null })),
    };
  }

  // ---- Engagements: offers, requests, negotiation and approval ----

  async listEngagements(actor: AuthenticatedUser) {
    const rows = await this.prisma.assetEngagement.findMany({ where: this.engagementScope(actor), orderBy: { updatedAt: 'desc' }, include: ENGAGEMENT_INCLUDE });
    return this.withAgreements(rows.map((row) => this.view(actor, row)));
  }

  async getEngagement(actor: AuthenticatedUser, id: string) {
    return (await this.withAgreements([this.view(actor, await this.findEngagement(actor, id))]))[0];
  }

  /** The one agreement drafted for each approved partnership, so either side opens it instead of drafting another. */
  private async withAgreements<T extends { id: string; status: string }>(views: T[]) {
    const approved = views.filter((view) => view.status === 'APPROVED').map((view) => view.id);
    const contracts = approved.length ? await this.prisma.contract.findMany({ where: { engagementId: { in: approved } }, select: { id: true, engagementId: true, contractNumber: true, status: true } }) : [];
    return views.map((view) => {
      const contract = contracts.find((item) => item.engagementId === view.id);
      return { ...view, agreement: contract ? { id: contract.id, contractNumber: contract.contractNumber, status: contract.status } : null };
    });
  }

  /** An asset owner offers an asset against a need (OFFER), or a delivery partner asks for a listed asset (REQUEST). */
  async createEngagement(actor: AuthenticatedUser, input: CreateEngagementDto) {
    const terms = cleanTerms(input.akad, input.terms);
    const problems = termsProblems(input.akad, terms, input.startDate, input.endDate);
    if (problems.length) throw new BadRequestException(`Add ${problems.join(', ')}.`);

    let direction: 'OFFER' | 'REQUEST';
    let party: Party;
    let asset: { id: string; organisationId: string; countryNodeId: string; assetType: string; status: string; offeredToPdp: boolean };
    let project: { projectId: string; organisationId: string };
    let needId: string | null = null;

    if (ASSET_OWNER_ROLES.has(actor.role)) {
      direction = 'OFFER';
      party = 'OWNER';
      if (!input.needId) throw new BadRequestException('Choose the project need you are offering the asset for.');
      const need = await this.prisma.projectAssetNeed.findFirst({ where: { id: input.needId, countryNodeId: actor.countryNodeId, status: 'OPEN' }, include: { project: { select: { projectId: true, organisationId: true, status: true } } } });
      if (!need) throw new NotFoundException('This need is no longer open.');
      if (need.organisationId === actor.organisationId) throw new BadRequestException('This need belongs to your own organisation.');
      if (CLOSED_PROJECT_STATUSES.includes(need.project.status)) throw new BadRequestException('This project no longer takes on assets.');
      const found = await this.prisma.asset.findFirst({ where: { id: input.assetId, organisationId: actor.organisationId, countryNodeId: actor.countryNodeId } });
      if (!found) throw new NotFoundException('Asset not found.');
      if (!typesMatch(need.assetType, found.assetType)) throw new BadRequestException('This asset is not the type of asset the project needs.');
      asset = found;
      project = need.project;
      needId = need.id;
    } else if (PDP_ROLES.has(actor.role)) {
      direction = 'REQUEST';
      party = 'PDP';
      if (!input.projectId) throw new BadRequestException('Choose the project that will use the asset.');
      project = await this.ownProject(actor, input.projectId);
      const found = await this.prisma.asset.findFirst({ where: { id: input.assetId, countryNodeId: actor.countryNodeId, offeredToPdp: true } });
      if (!found) throw new NotFoundException('This asset is not offered to delivery partners.');
      if (found.organisationId === actor.organisationId) throw new BadRequestException('This asset belongs to your own organisation.');
      if (input.needId) {
        const need = await this.prisma.projectAssetNeed.findFirst({ where: { id: input.needId, projectId: project.projectId, organisationId: actor.organisationId } });
        if (!need) throw new NotFoundException('Need not found for this project.');
        needId = need.id;
      }
      asset = found;
    } else {
      throw new ForbiddenException('Only asset owners and delivery partners take part in asset partnerships.');
    }
    if (asset.status !== 'VERIFIED') throw new BadRequestException('Only a verified asset can be offered.');

    const open = await this.prisma.assetEngagement.findFirst({ where: { assetId: asset.id, projectId: project.projectId, status: { in: OPEN_ENGAGEMENT_STATUSES } }, select: { id: true } });
    if (open) throw new ConflictException(`This asset is already under discussion for this project (${open.id}).`);

    const entry = this.entry(actor, party, 'PROPOSED', input.message, { akad: input.akad, terms, startDate: input.startDate, endDate: input.endDate });
    const created = await this.prisma.assetEngagement.create({
      data: {
        id: newCountryScopedId('ENG', actor.countryNodeId), assetId: asset.id, projectId: project.projectId, needId, countryNodeId: actor.countryNodeId,
        ownerOrganisationId: asset.organisationId, pdpOrganisationId: project.organisationId, direction, status: 'PROPOSED', awaiting: otherParty(party),
        akad: input.akad, terms: terms as Prisma.InputJsonValue, startDate: new Date(input.startDate), endDate: new Date(input.endDate),
        history: [entry] as unknown as Prisma.InputJsonValue, createdBy: actor.userId,
      },
      include: ENGAGEMENT_INCLUDE,
    });
    await this.record(actor, `asset_engagement.${direction.toLowerCase()}`, created);
    await this.notifyParty(created, otherParty(party), direction === 'OFFER' ? 'New asset offer for your project' : 'A delivery partner asks to use your asset', `${created.asset.name} for ${created.project.projectName} (${created.id}).`);
    return this.view(actor, created);
  }

  /** The side whose move it is accepts, declines or makes a counter-offer. */
  async respond(actor: AuthenticatedUser, id: string, input: RespondEngagementDto) {
    const engagement = await this.findEngagement(actor, id);
    const party = this.partyOf(actor, engagement);
    if (!party) throw new ForbiddenException('Only the asset owner or the delivery partner can respond.');
    if (engagement.status !== 'PROPOSED') throw new BadRequestException('This offer is no longer open for a response.');
    if (engagement.awaiting !== party) throw new BadRequestException('Waiting for the other side to respond.');
    const history = engagement.history as unknown as HistoryEntry[];
    let data: Prisma.AssetEngagementUpdateManyMutationInput;
    let notice: [string, string];

    if (input.action === 'ACCEPT') {
      if (history[history.length - 1]?.action?.endsWith('_CHANGES_REQUESTED')) throw new BadRequestException('A reviewer asked for changes. Make a counter-offer with the corrected terms; the other side then accepts it.');
      if (engagement.akad === 'MUSHARAKAH' && (engagement.terms as EngagementTerms).pdpContributionValue === undefined) throw new BadRequestException("Add the delivery partner's capital contribution with a counter-offer before accepting (0 if none): losses in a Musharakah are shared by capital.");
      await this.assertAssetFree(engagement);
      if (engagement.needId) await this.assertNeedHasRoom(engagement.needId, engagement.id);
      data = { status: 'ACCEPTED', awaiting: 'REVIEW', history: [...history, this.entry(actor, party, 'ACCEPTED', input.note)] as unknown as Prisma.InputJsonValue };
      notice = ['Asset partnership accepted', `${engagement.asset.name} for ${engagement.project.projectName} was accepted and now goes to Legal and Shariah review.`];
    } else if (input.action === 'DECLINE') {
      data = { status: 'DECLINED', awaiting: 'NONE', history: [...history, this.entry(actor, party, 'DECLINED', input.note)] as unknown as Prisma.InputJsonValue };
      notice = ['Asset partnership declined', `${engagement.asset.name} for ${engagement.project.projectName} was declined.`];
    } else {
      const akad = (input.akad ?? engagement.akad) as Akad;
      // Only the fields the counter-offer sets: the validated DTO carries the others as undefined.
      const changed = Object.fromEntries(Object.entries(input.terms ?? {}).filter(([, value]) => value !== undefined));
      const terms = cleanTerms(akad, { ...(engagement.terms as EngagementTerms), ...changed });
      const startDate = input.startDate ?? day(engagement.startDate)!;
      const endDate = input.endDate ?? day(engagement.endDate)!;
      const problems = termsProblems(akad, terms, startDate, endDate);
      if (problems.length) throw new BadRequestException(`Add ${problems.join(', ')}.`);
      // A counter-offer that changes nothing only passes the turn back and forth.
      if (akad === engagement.akad && startDate === day(engagement.startDate) && endDate === day(engagement.endDate) && sameTerms(terms, cleanTerms(akad, engagement.terms as EngagementTerms))) {
        throw new BadRequestException('This counter-offer changes nothing. Change the terms, or accept or decline them.');
      }
      data = {
        akad, terms: terms as Prisma.InputJsonValue, startDate: new Date(startDate), endDate: new Date(endDate), awaiting: otherParty(party),
        history: [...history, this.entry(actor, party, 'COUNTERED', input.note, { akad, terms, startDate, endDate })] as unknown as Prisma.InputJsonValue,
      };
      notice = ['New counter-offer', `${engagement.asset.name} for ${engagement.project.projectName}: the other side proposed new terms.`];
    }
    // Claimed atomically, so two people on the same side cannot both respond.
    const claimed = await this.prisma.assetEngagement.updateMany({ where: { id, status: 'PROPOSED', awaiting: party }, data });
    if (!claimed.count) throw new ConflictException('Someone already responded. Refresh to see the latest.');
    const updated = await this.prisma.assetEngagement.findUniqueOrThrow({ where: { id }, include: ENGAGEMENT_INCLUDE });
    await this.record(actor, `asset_engagement.${input.action.toLowerCase()}`, updated);
    await this.notifyParty(updated, otherParty(party), ...notice);
    if (input.action === 'ACCEPT') await this.notifyReviewers(updated);
    return this.view(actor, updated);
  }

  /** Either side may withdraw before Legal and Shariah approve. */
  async withdraw(actor: AuthenticatedUser, id: string, input: WithdrawEngagementDto) {
    const engagement = await this.findEngagement(actor, id);
    const party = this.partyOf(actor, engagement);
    if (!party) throw new ForbiddenException('Only the asset owner or the delivery partner can withdraw.');
    if (!OPEN_ENGAGEMENT_STATUSES.includes(engagement.status)) throw new BadRequestException('Only an offer still being discussed or reviewed can be withdrawn.');
    if (engagement.status === 'PROPOSED' && engagement.awaiting === party) throw new BadRequestException('It is your turn to respond: decline it instead.');
    const history = [...(engagement.history as unknown as HistoryEntry[]), this.entry(actor, party, 'WITHDRAWN', input.note)];
    const claimed = await this.prisma.assetEngagement.updateMany({ where: { id, status: { in: OPEN_ENGAGEMENT_STATUSES } }, data: { status: 'WITHDRAWN', awaiting: 'NONE', history: history as unknown as Prisma.InputJsonValue } });
    if (!claimed.count) throw new ConflictException('This offer changed meanwhile. Refresh to see the latest.');
    const updated = await this.prisma.assetEngagement.findUniqueOrThrow({ where: { id }, include: ENGAGEMENT_INCLUDE });
    await this.record(actor, 'asset_engagement.withdraw', updated);
    await this.notifyParty(updated, otherParty(party), 'Asset partnership withdrawn', `${updated.asset.name} for ${updated.project.projectName} was withdrawn.`);
    return this.view(actor, updated);
  }

  /**
   * The system's checks on an accepted partnership, for its Legal and Shariah reviewers: the deal
   * against the need, the asset's documents and title findings, the parties, and the akad terms.
   */
  async reviewChecks(actor: AuthenticatedUser, id: string) {
    if (!REVIEWERS.has(actor.role)) throw new ForbiddenException('Only Legal and Shariah reviewers see the review checks.');
    const engagement = await this.findEngagement(actor, id);
    return { engagementId: id, checks: await this.checksFor(engagement), generatedAt: new Date().toISOString() };
  }

  private async checksFor(engagement: EngagementRow): Promise<ReviewCheck[]> {
    const [asset, need, pdpApplication, overlapping] = await Promise.all([
      this.prisma.asset.findUnique({ where: { id: engagement.assetId }, select: { assetType: true, status: true, isEncumbered: true, estimatedValue: true, valuationDate: true, details: true, checkFindings: true, documents: { select: { documentType: true } } } }),
      engagement.needId ? this.prisma.projectAssetNeed.findUnique({ where: { id: engagement.needId }, select: { assetType: true, title: true, startDate: true, endDate: true } }) : Promise.resolve(null),
      this.prisma.pdpApplication.findFirst({ where: { OR: [{ organisationId: engagement.pdpOrganisationId }, { organisationName: engagement.project.organisation.name }], status: { not: 'DRAFT' } }, orderBy: { updatedAt: 'desc' }, select: { status: true } }),
      this.prisma.assetEngagement.count({ where: { assetId: engagement.assetId, id: { not: engagement.id }, status: { in: HOLDING_ENGAGEMENT_STATUSES }, startDate: { lt: engagement.endDate }, endDate: { gt: engagement.startDate } } }),
    ]);
    if (!asset) throw new NotFoundException('Asset not found.');
    return partnershipChecks({
      akad: engagement.akad as Akad, terms: engagement.terms as EngagementTerms, startDate: engagement.startDate, endDate: engagement.endDate,
      need, project: { sector: engagement.project.sector, projectName: engagement.project.projectName },
      asset: { assetType: asset.assetType, status: asset.status, isEncumbered: asset.isEncumbered, estimatedValue: Number(asset.estimatedValue), valuationDate: asset.valuationDate, details: asset.details as AssetDetails | null, checkFindings: asset.checkFindings, documentTypes: asset.documents.map((document) => document.documentType) },
      pdpApplicationStatus: pdpApplication?.status ?? null, overlappingCommitments: overlapping,
    });
  }

  /** Legal and Shariah each approve once, by different people, neither from either party; one rejection ends it. */
  async review(actor: AuthenticatedUser, id: string, input: ReviewEngagementDto) {
    if (!REVIEWERS.has(actor.role)) throw new ForbiddenException('Only Legal and Shariah reviewers can approve asset partnerships.');
    const engagement = await this.findEngagement(actor, id);
    if (engagement.status !== 'ACCEPTED') throw new BadRequestException('Only an accepted offer awaits review.');
    if (actor.organisationId === engagement.ownerOrganisationId || actor.organisationId === engagement.pdpOrganisationId) throw new ForbiddenException('You cannot review a partnership your own organisation is part of.');
    const track = this.trackFor(actor, input.track);
    const approvedBy = track === 'LEGAL' ? engagement.legalApprovedBy : engagement.shariahApprovedBy;
    if (approvedBy) throw new ConflictException(`The ${track === 'LEGAL' ? 'Legal' : 'Shariah'} approval is already given.`);
    if ((track === 'LEGAL' ? engagement.shariahApprovedBy : engagement.legalApprovedBy) === actor.userId) throw new ForbiddenException('The Legal and Shariah approvals must be given by different people.');

    const history = engagement.history as unknown as HistoryEntry[];
    const label = track === 'LEGAL' ? 'Legal' : 'Shariah';
    // What the system flagged for this reviewer when they decided, kept with the decision for audit.
    const flagged = checkSummary(await this.checksFor(engagement).catch(() => []), track);
    const decided = (action: string) => ({ ...this.entry(actor, 'REVIEW', action, input.note), checks: { fail: flagged.fail, warn: flagged.warn } });
    const field = track === 'LEGAL' ? { legalApprovedBy: null } : { shariahApprovedBy: null };
    let data: Prisma.AssetEngagementUpdateManyMutationInput;
    let finished = false;
    if (input.decision === 'REJECT') {
      data = { status: 'REJECTED', awaiting: 'NONE', history: [...history, decided(`${track}_REJECTED`)] as unknown as Prisma.InputJsonValue };
    } else if (input.decision === 'REQUEST_CHANGES') {
      // Back to the side whose terms were accepted: it corrects them with a counter-offer, the other side
      // accepts, and both reviews start again.
      data = {
        status: 'PROPOSED', awaiting: this.termsAuthor(engagement), legalApprovedBy: null, legalApprovedAt: null, shariahApprovedBy: null, shariahApprovedAt: null,
        history: [...history, decided(`${track}_CHANGES_REQUESTED`)] as unknown as Prisma.InputJsonValue,
      };
    } else {
      const now = new Date();
      finished = Boolean(track === 'LEGAL' ? engagement.shariahApprovedBy : engagement.legalApprovedBy);
      if (finished) await this.assertAssetFree(engagement);
      data = {
        ...(track === 'LEGAL' ? { legalApprovedBy: actor.userId, legalApprovedAt: now } : { shariahApprovedBy: actor.userId, shariahApprovedAt: now }),
        ...(finished ? { status: 'APPROVED', awaiting: 'NONE' } : {}),
        history: [...history, decided(`${track}_APPROVED`)] as unknown as Prisma.InputJsonValue,
      };
    }
    const claimed = await this.prisma.assetEngagement.updateMany({ where: { id, status: 'ACCEPTED', ...field }, data });
    if (!claimed.count) throw new ConflictException('Someone already reviewed this. Refresh to see the latest.');
    const updated = await this.prisma.assetEngagement.findUniqueOrThrow({ where: { id }, include: ENGAGEMENT_INCLUDE });
    await this.record(actor, `asset_engagement.${track.toLowerCase()}_${input.decision.toLowerCase()}`, updated);
    if (finished && updated.needId) await this.markNeedFilled(updated.needId);
    const [title, message] = input.decision === 'REJECT'
      ? [`Asset partnership rejected by ${label}`, `${updated.asset.name} for ${updated.project.projectName}: ${input.note}`]
      : input.decision === 'REQUEST_CHANGES'
        ? [`${label} review: changes requested`, `${updated.asset.name} for ${updated.project.projectName}: ${input.note} The ${updated.awaiting === 'OWNER' ? 'asset owner' : 'delivery partner'} makes a counter-offer with the corrected terms; once accepted, it is reviewed again.`]
      : finished
        ? ['Asset partnership approved', `${updated.asset.name} is committed to ${updated.project.projectName} from ${day(updated.startDate)} to ${day(updated.endDate)}. The agreement can now be drafted.`]
        : [`${label} approval given`, `${updated.asset.name} for ${updated.project.projectName} now awaits the ${track === 'LEGAL' ? 'Shariah' : 'Legal'} approval.`];
    await this.notifyParty(updated, 'OWNER', title, message);
    await this.notifyParty(updated, 'PDP', title, message);
    return this.view(actor, updated);
  }

  // ---- Helpers ----

  /** The side that wrote the terms now on the table: the last to propose or counter. */
  private termsAuthor(engagement: { direction: string; history: unknown }): Party {
    const history = engagement.history as unknown as HistoryEntry[];
    const last = [...history].reverse().find((entry) => entry.action === 'PROPOSED' || entry.action === 'COUNTERED');
    return last && (last.party === 'OWNER' || last.party === 'PDP') ? last.party : engagement.direction === 'OFFER' ? 'OWNER' : 'PDP';
  }

  private assertPdp(actor: AuthenticatedUser) {
    if (!PDP_ROLES.has(actor.role)) throw new ForbiddenException('Only a delivery partner (Project Sponsor, Project Manager or Organization Admin) can do this.');
  }

  private async ownProject(actor: AuthenticatedUser, projectId: string) {
    const project = await this.prisma.project.findFirst({ where: { projectId, organisationId: actor.organisationId, countryNodeId: actor.countryNodeId }, select: { projectId: true, organisationId: true, status: true } });
    if (!project) throw new NotFoundException('Project not found in your organisation.');
    if (CLOSED_PROJECT_STATUSES.includes(project.status)) throw new BadRequestException('This project no longer takes on assets.');
    return project;
  }

  private engagementScope(actor: AuthenticatedUser): Prisma.AssetEngagementWhereInput {
    if (actor.role === 'Super Admin') return {};
    if (REVIEWERS.has(actor.role)) return { countryNodeId: actor.countryNodeId };
    if (ASSET_OWNER_ROLES.has(actor.role)) return { countryNodeId: actor.countryNodeId, ownerOrganisationId: actor.organisationId };
    if (PDP_ROLES.has(actor.role)) return { countryNodeId: actor.countryNodeId, pdpOrganisationId: actor.organisationId };
    throw new ForbiddenException('Asset partnerships are for asset owners, delivery partners and reviewers.');
  }

  private async findEngagement(actor: AuthenticatedUser, id: string): Promise<EngagementRow> {
    const engagement = await this.prisma.assetEngagement.findFirst({ where: { id, ...this.engagementScope(actor) }, include: ENGAGEMENT_INCLUDE });
    if (!engagement) throw new NotFoundException('Asset partnership not found.');
    return engagement;
  }

  private partyOf(actor: AuthenticatedUser, engagement: { ownerOrganisationId: string; pdpOrganisationId: string }): Party | null {
    if (ASSET_OWNER_ROLES.has(actor.role) && actor.organisationId === engagement.ownerOrganisationId) return 'OWNER';
    if (PDP_ROLES.has(actor.role) && actor.organisationId === engagement.pdpOrganisationId) return 'PDP';
    return null;
  }

  private trackFor(actor: AuthenticatedUser, requested?: 'LEGAL' | 'SHARIAH'): 'LEGAL' | 'SHARIAH' {
    if (actor.role === 'Super Admin') {
      if (!requested) throw new BadRequestException('Say whether this is the Legal or the Shariah approval.');
      return requested;
    }
    if (SHARIAH_REVIEWERS.has(actor.role)) return 'SHARIAH';
    return 'LEGAL';
  }

  /** The asset may not be held by another accepted or approved partnership for an overlapping period. */
  private async assertAssetFree(engagement: { id: string; assetId: string; startDate: Date; endDate: Date }) {
    const holding = await this.prisma.assetEngagement.findMany({ where: { assetId: engagement.assetId, id: { not: engagement.id }, status: { in: HOLDING_ENGAGEMENT_STATUSES } }, select: { id: true, startDate: true, endDate: true } });
    const clash = holding.find((other) => periodsOverlap(other, engagement));
    if (clash) throw new ConflictException(`The asset is already committed from ${day(clash.startDate)} to ${day(clash.endDate)} (${clash.id}). Agree different dates first.`);
  }

  private async markNeedFilled(needId: string) {
    const need = await this.prisma.projectAssetNeed.findUnique({ where: { id: needId }, select: { quantity: true, status: true } });
    if (!need || need.status !== 'OPEN') return;
    const approved = await this.prisma.assetEngagement.count({ where: { needId, status: 'APPROVED' } });
    if (approved < need.quantity) return;
    await this.prisma.projectAssetNeed.update({ where: { id: needId }, data: { status: 'FILLED' } });
    await this.closeOpenOffers(needId, 'The need has been filled by other assets, so this offer was closed. Thank you for offering.');
  }

  /** A need takes no more accepted or approved assets than it asked for. */
  private async assertNeedHasRoom(needId: string, engagementId: string) {
    const need = await this.prisma.projectAssetNeed.findUnique({ where: { id: needId }, select: { quantity: true, status: true } });
    if (!need) return;
    if (need.status !== 'OPEN') throw new ConflictException('This need is no longer open (filled or closed).');
    const held = await this.prisma.assetEngagement.count({ where: { needId, id: { not: engagementId }, status: { in: HOLDING_ENGAGEMENT_STATUSES } } });
    if (held >= need.quantity) throw new ConflictException(`This need already has ${held} of ${need.quantity} asset${need.quantity === 1 ? '' : 's'} accepted or approved. Decline this offer, or withdraw another first.`);
  }

  /** Declines the offers and requests still under discussion for a need that is filled or closed, and tells their owners. */
  private async closeOpenOffers(needId: string, reason: string) {
    const open = await this.prisma.assetEngagement.findMany({ where: { needId, status: 'PROPOSED' }, include: ENGAGEMENT_INCLUDE });
    for (const row of open) {
      const history = [...(row.history as unknown as HistoryEntry[]), { at: new Date().toISOString(), by: 'SYSTEM', byName: 'Wealth Pooling', party: 'PDP' as const, action: 'DECLINED', note: reason }];
      const closed = await this.prisma.assetEngagement.updateMany({ where: { id: row.id, status: 'PROPOSED' }, data: { status: 'DECLINED', awaiting: 'NONE', history: history as unknown as Prisma.InputJsonValue } });
      if (closed.count) await this.notifyParty(row, 'OWNER', 'Offer closed', `${row.asset.name} for ${row.project.projectName}: ${reason}`);
    }
  }

  private entry(actor: AuthenticatedUser, party: Party | 'REVIEW', action: string, note?: string, offer?: { akad: Akad; terms: EngagementTerms; startDate: string; endDate: string }): HistoryEntry {
    return { at: new Date().toISOString(), by: actor.userId, byName: actor.name, party, action, ...(note ? { note } : {}), ...(offer ? { akad: offer.akad, terms: offer.terms, startDate: offer.startDate.slice(0, 10), endDate: offer.endDate.slice(0, 10) } : {}) };
  }

  /**
   * The engagement as this actor may see it. Before a deal, a delivery partner sees what the asset is
   * and roughly where, not its identifiers or value; the owner's name shows once the owner has made
   * an offer or accepted.
   */
  private view(actor: AuthenticatedUser, row: EngagementRow) {
    const party = this.partyOf(actor, row);
    const reviewer = !party && (REVIEWERS.has(actor.role) || actor.role === 'Super Admin');
    const dealDone = ['ACCEPTED', 'APPROVED'].includes(row.status);
    const fullAsset = party === 'OWNER' || reviewer || row.status === 'APPROVED';
    const revealOwner = party === 'OWNER' || reviewer || row.direction === 'OFFER' || dealDone;
    const details = row.asset.details as AssetDetails | null;
    return {
      id: row.id,
      direction: row.direction,
      status: row.status,
      awaiting: row.awaiting,
      myParty: party,
      canRespond: row.status === 'PROPOSED' && party !== null && row.awaiting === party,
      // The side whose turn it is declines instead; the proposer may withdraw, and either side after acceptance.
      canWithdraw: party !== null && (row.status === 'ACCEPTED' || (row.status === 'PROPOSED' && row.awaiting !== party)),
      canReview: reviewer && row.status === 'ACCEPTED' && actor.organisationId !== row.ownerOrganisationId && actor.organisationId !== row.pdpOrganisationId,
      akad: row.akad,
      terms: row.terms,
      startDate: day(row.startDate),
      endDate: day(row.endDate),
      asset: {
        id: row.asset.id,
        assetType: row.asset.assetType,
        name: row.asset.name,
        region: regionOf(details),
        details: fullAsset ? details : publicDetails(row.asset.assetType, details),
        isEncumbered: row.asset.isEncumbered,
        ...(fullAsset ? { location: row.asset.location, titleReference: row.asset.titleReference, estimatedValue: Number(row.asset.estimatedValue), currency: row.asset.currency, encumbranceNote: row.asset.encumbranceNote } : {}),
      },
      ownerOrganisationName: revealOwner ? row.asset.organisation.name : null,
      project: { projectId: row.project.projectId, projectCode: row.project.projectCode, projectName: row.project.projectName, sector: row.project.sector, status: row.project.status, organisationName: row.project.organisation.name },
      need: row.need ? { id: row.need.id, title: row.need.title, quantity: row.need.quantity } : null,
      legalApprovedAt: row.legalApprovedAt?.toISOString() ?? null,
      shariahApprovedAt: row.shariahApprovedAt?.toISOString() ?? null,
      history: row.history,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private record(actor: AuthenticatedUser, action: string, engagement: { id: string; countryNodeId: string; status: string; assetId: string; projectId: string; akad: string }) {
    return this.audit.recordActor(actor, { action, resourceType: 'AssetEngagement', resourceId: engagement.id, organisationId: actor.organisationId, countryNodeId: engagement.countryNodeId, metadata: { status: engagement.status, assetId: engagement.assetId, projectId: engagement.projectId, akad: engagement.akad } });
  }

  /** In-app notice to the asset's owner, or to the project's sponsor and whoever posted the need. */
  private async notifyParty(row: EngagementRow, party: Party, title: string, message: string) {
    if (!this.notifications) return;
    const recipients = party === 'OWNER'
      ? [{ userId: row.asset.ownerUserId, organisationId: row.ownerOrganisationId }]
      : [...new Set([row.project.projectSponsorId, row.need?.createdBy].filter((value): value is string => Boolean(value)))].map((userId) => ({ userId, organisationId: row.pdpOrganisationId }));
    await this.send(row, recipients, title, message);
  }

/**
   * Tells every asset owner in the country about a new need, including those who have not registered
   * an asset of that type yet: they may own one and register it to take part.
   */
  private async notifyAssetOwnersOfNeed(need: { id: string; projectId: string; organisationId: string; countryNodeId: string; assetType: string; quantity: number; title: string }) {
    if (!this.notifications) return;
    const types = need.assetType === 'MACHINERY' || need.assetType === 'EQUIPMENT' ? ['MACHINERY', 'EQUIPMENT'] : [need.assetType];
    const [project, owners, unverified] = await Promise.all([
      this.prisma.project.findUnique({ where: { projectId: need.projectId }, select: { projectName: true, organisation: { select: { name: true } } } }),
      this.prisma.userRoleAssignment.findMany({ where: { role: { in: ['Asset_Owner', 'Asset_Manager'] as PrismaUserRole[] }, isActive: true, countryNodeId: need.countryNodeId, organisationId: { not: need.organisationId } }, select: { userId: true, organisationId: true } }),
      this.prisma.asset.findMany({ where: { countryNodeId: need.countryNodeId, assetType: { in: types }, status: { in: ['DRAFT', 'SUBMITTED', 'CHANGES_REQUESTED'] }, organisationId: { not: need.organisationId } }, select: { id: true, name: true, status: true, ownerUserId: true, organisationId: true } }),
    ]);
    await this.alertUnverifiedAssets(need, project?.projectName ?? 'a project', unverified);
    const type = (NEED_TYPE_NAMES[need.assetType] ?? need.assetType.toLowerCase());
    const message = `${project?.organisation.name ?? 'A delivery partner'} needs ${need.quantity} × ${type} for ${project?.projectName ?? 'a project'}: ${need.title}. Offer a verified asset, or register one to take part.`;
    // One per user and organisation: notifications are shown in the organisation the user signs in for.
    const unique = [...new Map(owners.map((owner) => [`${owner.userId}|${owner.organisationId}`, owner])).values()];
    await Promise.all(unique.map((owner) => this.notifications!.enqueue({
      recipientUserId: owner.userId, organisationId: owner.organisationId, countryNodeId: need.countryNodeId, type: 'ASSET_NEED',
      title: 'A project is looking for assets', message, resourceType: 'ProjectAssetNeed', resourceId: need.id, dedupeKey: `asset-need:${need.id}:${owner.userId}:${owner.organisationId}`,
    }).catch(() => undefined)));
  }

  /**
   * Only verified assets can be offered. Owners whose asset of the needed type is not verified yet are
   * told what to do to take part, and the country's verifiers are asked to look at submitted ones first.
   */
  private async alertUnverifiedAssets(need: { id: string; countryNodeId: string; title: string }, projectName: string, assets: Array<{ id: string; name: string; status: string; ownerUserId: string; organisationId: string }>) {
    if (!this.notifications || !assets.length) return;
    const step: Record<string, string> = { DRAFT: 'upload its documents and submit it for verification', SUBMITTED: 'it is waiting for verification; reply quickly if the verifier asks for anything', CHANGES_REQUESTED: 'make the changes the verifier asked for and submit it again' };
    await Promise.all(assets.map((asset) => this.notifications!.enqueue({
      recipientUserId: asset.ownerUserId, organisationId: asset.organisationId, countryNodeId: need.countryNodeId, type: 'ASSET_NEED',
      title: 'Verify your asset to take part', message: `${projectName} needs this type of asset (${need.title}). ${asset.name} is not verified yet: ${step[asset.status]}. Only verified assets can be offered, so act soon.`,
      resourceType: 'Asset', resourceId: asset.id, dedupeKey: `asset-need-verify:${need.id}:${asset.id}`,
    }).catch(() => undefined)));
    const submitted = assets.filter((asset) => asset.status === 'SUBMITTED');
    if (!submitted.length) return;
    const verifiers = await this.prisma.userRoleAssignment.findMany({ where: { role: { in: ['Country_Admin', 'Legal_Officer'] as PrismaUserRole[] }, isActive: true, countryNodeId: need.countryNodeId }, select: { userId: true, organisationId: true } });
    const unique = [...new Map(verifiers.map((verifier) => [`${verifier.userId}|${verifier.organisationId}`, verifier])).values()];
    await Promise.all(unique.flatMap((verifier) => submitted.filter((asset) => asset.organisationId !== verifier.organisationId).map((asset) => this.notifications!.enqueue({
      recipientUserId: verifier.userId, organisationId: verifier.organisationId, countryNodeId: need.countryNodeId, type: 'ASSET_VERIFICATION',
      title: 'Asset to verify first', message: `A project needs this type of asset. ${asset.name} is waiting for verification; verifying it soon lets its owner offer it.`,
      resourceType: 'Asset', resourceId: asset.id, dedupeKey: `asset-need-verifier:${need.id}:${asset.id}:${verifier.userId}`,
    }).catch(() => undefined))));
  }

  private async notifyReviewers(row: EngagementRow) {
    if (!this.notifications) return;
    const roles = ['Legal_Officer', 'Shariah_Reviewer', 'Shariah_Advisor', 'Shariah_Committee'] as PrismaUserRole[];
    const reviewers = await this.prisma.userRoleAssignment.findMany({ where: { role: { in: roles }, isActive: true, countryNodeId: row.countryNodeId, organisationId: { notIn: [row.ownerOrganisationId, row.pdpOrganisationId] } }, select: { userId: true, organisationId: true } });
    await this.send(row, reviewers, 'Asset partnership to review', `${row.asset.name} for ${row.project.projectName}: ${row.akad === 'IJARAH' ? 'Ijarah' : 'Musharakah'} from ${day(row.startDate)} to ${day(row.endDate)} (${row.id}).`);
  }

  private async send(row: EngagementRow, recipients: Array<{ userId: string; organisationId: string }>, title: string, message: string) {
    const unique = [...new Map(recipients.map((recipient) => [recipient.userId, recipient])).values()];
    await Promise.all(unique.map((recipient) => this.notifications!.enqueue({
      recipientUserId: recipient.userId, organisationId: recipient.organisationId, countryNodeId: row.countryNodeId, type: 'ASSET_PARTNERSHIP',
      title, message, resourceType: 'AssetEngagement', resourceId: row.id, dedupeKey: `asset-engagement:${row.id}:${recipient.userId}:${title}:${row.updatedAt.toISOString()}`,
    }).catch(() => undefined)));
  }
}
