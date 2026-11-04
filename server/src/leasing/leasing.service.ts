import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { Prisma, UserRole as PrismaUserRole } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { AssetDetails } from '../assets/asset-checks';
import { ASSET_OWNER_ROLES } from '../assets/assets.service';
import { publicDetails, regionOf } from '../asset-partnerships/asset-partnership-rules';
import { NotificationService } from '../notifications/notification.service';
import { PrismaService } from '../prisma.service';
import { newCountryScopedId } from '../users/user-identity';
import { CreateLeaseDto, EndLeaseDto, LeasableUnitDto, LeaseNoteDto, RecordDepositDto, RecordRentPaymentDto, RenewLeaseDto, RespondLeaseDto, ReturnDepositDto, ReviewLeaseDto, UpdateLeasableUnitDto } from './leasing.dto';
import { daysUntil, DepositKind, DepositRefund, depositsOf, depositFor, depositRefund, depositRefundDueBy, refundableDeposits, endingReminder, HOLDING_LEASE_STATUSES, isOverdue, LeaseParty, leaseEndDate, leaseTermMonths, OPEN_LEASE_STATUSES, otherLeaseParty, rentReminder, rentSchedule, shariahFlags } from './leasing-rules';

/** Roles that rent space for their company. */
export const TENANT_ROLES: ReadonlySet<string> = new Set(['Organization Admin', 'Corporate Investor', 'Project Sponsor', 'Project Manager']);
/** Legal approval: the lease terms and the owner's right to lease. */
const LEGAL_REVIEWERS: ReadonlySet<string> = new Set(['Legal Officer', 'Country Admin', 'Super Admin']);
/** Shariah approval: the akad, and that the tenant's use is permissible. */
const SHARIAH_REVIEWERS: ReadonlySet<string> = new Set(['Shariah Reviewer', 'Shariah Advisor', 'Shariah Committee', 'Super Admin']);
const REVIEWERS: ReadonlySet<string> = new Set([...LEGAL_REVIEWERS, ...SHARIAH_REVIEWERS]);

interface LeaseHistoryEntry {
  at: string;
  by: string;
  byName: string;
  party: LeaseParty | 'REVIEW' | 'SYSTEM';
  action: string;
  note?: string;
  terms?: { monthlyRent: number; depositAmount: number; utilityDepositAmount: number; renovationDepositAmount: number; startDate: string; endDate: string; termMonths: number };
  statement?: string;
}

const UNIT_ASSET = { select: { id: true, name: true, assetType: true, location: true, details: true, status: true, ownerUserId: true, organisationId: true, organisation: { select: { name: true } } } } as const;
const LEASE_INCLUDE = {
  unit: { include: { asset: UNIT_ASSET } },
  payments: { orderBy: { dueDate: 'asc' } },
} satisfies Prisma.AssetLeaseInclude;
type LeaseRow = Prisma.AssetLeaseGetPayload<{ include: typeof LEASE_INCLUDE }>;

const day = (date: Date | null | undefined) => (date ? date.toISOString().slice(0, 10) : null);
const money = (currency: string, amount: number) => `${currency} ${amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Direct leasing: an asset owner lists a unit of a verified asset (a floor, a shop lot, the whole
 * asset) and a company in the same country asks to rent it under Ijarah, without a project. The two
 * sides agree the rent, deposit and term; Legal and Shariah approve; the monthly rent schedule is then
 * kept here. Rent goes from the tenant straight to the owner's bank account: the platform records it
 * and never holds it.
 */
@Injectable()
export class LeasingService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService, @Optional() private readonly notifications?: NotificationService) {}

  // ---- Units: the owner lists what can be rented ----

  /** The owner's units with the lease that holds each one today and the requests waiting for them. */
  async myUnits(actor: AuthenticatedUser) {
    this.assertOwner(actor);
    const [units, assets] = await Promise.all([
      this.prisma.leasableUnit.findMany({
        where: { organisationId: actor.organisationId, countryNodeId: actor.countryNodeId },
        orderBy: [{ assetId: 'asc' }, { label: 'asc' }],
        include: { asset: UNIT_ASSET, leases: { where: { status: { in: [...HOLDING_LEASE_STATUSES, 'PROPOSED'] } }, select: { id: true, status: true, awaiting: true, startDate: true, endDate: true, tenantOrganisationId: true } } },
      }),
      this.prisma.asset.findMany({ where: { organisationId: actor.organisationId, countryNodeId: actor.countryNodeId, status: 'VERIFIED' }, select: { id: true, name: true, assetType: true }, orderBy: { name: 'asc' } }),
    ]);
    const today = new Date();
    return {
      // The verified assets a unit can be added to.
      assets,
      units: units.map(({ leases, asset, ...unit }) => {
        const current = leases.find((lease) => lease.status === 'APPROVED' && lease.startDate <= today && lease.endDate >= today);
        return {
          ...this.unitView(unit, asset),
          occupiedUntil: day(current?.endDate),
          requests: leases.filter((lease) => lease.status === 'PROPOSED' && lease.awaiting === 'OWNER').length,
        };
      }),
    };
  }

  async createUnit(actor: AuthenticatedUser, input: LeasableUnitDto) {
    this.assertOwner(actor);
    const asset = await this.prisma.asset.findFirst({ where: { id: input.assetId, organisationId: actor.organisationId, countryNodeId: actor.countryNodeId } });
    if (!asset) throw new NotFoundException('Asset not found.');
    if (asset.status !== 'VERIFIED') throw new BadRequestException('Only a verified asset can be leased out.');
    const unit = await this.prisma.leasableUnit.create({
      data: {
        id: newCountryScopedId('UNIT', actor.countryNodeId), assetId: asset.id, organisationId: asset.organisationId, countryNodeId: asset.countryNodeId,
        label: input.label, description: input.description ?? '', floorArea: input.floorArea ?? null, floorAreaUnit: input.floorAreaUnit ?? 'SQFT',
        monthlyRent: input.monthlyRent, currency: input.currency, depositMonths: input.depositMonths ?? 2, minTermMonths: input.minTermMonths ?? 12,
        utilityDepositMonths: input.utilityDepositMonths ?? 1, renovationDeposit: input.renovationDeposit ?? 0, utilitiesPaidBy: input.utilitiesPaidBy ?? 'TENANT_DIRECT',
        availableFrom: input.availableFrom ? new Date(input.availableFrom) : null, permittedUse: input.permittedUse ?? '', createdBy: actor.userId,
      },
      include: { asset: UNIT_ASSET },
    });
    await this.audit.recordActor(actor, { action: 'leasable_unit.create', resourceType: 'LeasableUnit', resourceId: unit.id, organisationId: unit.organisationId, countryNodeId: unit.countryNodeId, metadata: { assetId: unit.assetId, label: unit.label, monthlyRent: input.monthlyRent, currency: unit.currency } });
    return this.unitView(unit, unit.asset);
  }

  async updateUnit(actor: AuthenticatedUser, id: string, input: UpdateLeasableUnitDto) {
    this.assertOwner(actor);
    const unit = await this.prisma.leasableUnit.findFirst({ where: { id, organisationId: actor.organisationId, countryNodeId: actor.countryNodeId } });
    if (!unit) throw new NotFoundException('Unit not found.');
    const changes = Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
    const updated = await this.prisma.leasableUnit.update({
      where: { id },
      data: { ...changes, ...(input.availableFrom !== undefined ? { availableFrom: new Date(input.availableFrom) } : {}) },
      include: { asset: UNIT_ASSET },
    });
    await this.audit.recordActor(actor, { action: input.status === 'WITHDRAWN' ? 'leasable_unit.withdraw' : input.status === 'LISTED' && unit.status !== 'LISTED' ? 'leasable_unit.relist' : 'leasable_unit.update', resourceType: 'LeasableUnit', resourceId: id, organisationId: unit.organisationId, countryNodeId: unit.countryNodeId, metadata: changes });
    return this.unitView(updated, updated.asset);
  }

  /** Units other owners in the country list, with the periods already taken, for companies looking for space. */
  async availableUnits(actor: AuthenticatedUser) {
    if (!TENANT_ROLES.has(actor.role) && !REVIEWERS.has(actor.role)) throw new ForbiddenException('Only companies looking for space can browse units.');
    const units = await this.prisma.leasableUnit.findMany({
      where: { countryNodeId: actor.countryNodeId, status: 'LISTED', organisationId: { not: actor.organisationId }, asset: { status: 'VERIFIED' } },
      orderBy: { updatedAt: 'desc' },
      include: { asset: UNIT_ASSET, leases: { where: { status: { in: HOLDING_LEASE_STATUSES }, endDate: { gte: new Date() } }, select: { startDate: true, endDate: true } } },
    });
    return units.map(({ leases, asset, ...unit }) => ({
      ...this.unitView(unit, asset, true),
      taken: leases.map((lease) => ({ startDate: day(lease.startDate), endDate: day(lease.endDate) })),
    }));
  }

  // ---- Leases: request, negotiation, review and rent ----

  async listLeases(actor: AuthenticatedUser) {
    const rows = await this.prisma.assetLease.findMany({ where: this.leaseScope(actor), orderBy: { updatedAt: 'desc' }, include: LEASE_INCLUDE });
    const [names, agreements, contacts, renewals] = await Promise.all([this.tenantNames(rows), this.agreements(rows), this.contacts(actor, rows), this.renewals(rows)]);
    return rows.map((row) => ({ ...this.view(actor, row, names, renewals.get(row.id) ?? null), agreement: agreements.get(row.id) ?? null, counterparty: contacts.get(row.id) ?? null }));
  }

  async getLease(actor: AuthenticatedUser, id: string) {
    const row = await this.findLease(actor, id);
    const [names, agreements, contacts, renewals] = await Promise.all([this.tenantNames([row]), this.agreements([row]), this.contacts(actor, [row]), this.renewals([row])]);
    return { ...this.view(actor, row, names, renewals.get(row.id) ?? null), agreement: agreements.get(row.id) ?? null, counterparty: contacts.get(row.id) ?? null };
  }

  /** The Ijarah agreement drafted for each lease (contract-intelligence), so the parties open it instead of drafting another. */
  private async agreements(rows: Array<{ id: string }>) {
    const contracts = rows.length ? await this.prisma.contract.findMany({ where: { leaseId: { in: rows.map((row) => row.id) } }, select: { id: true, leaseId: true, contractNumber: true, status: true } }) : [];
    return new Map(contracts.map((contract) => [contract.leaseId!, { id: contract.id, contractNumber: contract.contractNumber, status: contract.status }]));
  }

  /** The renewal under way or agreed for each lease, if any (a declined or withdrawn one does not count). */
  private async renewals(rows: Array<{ id: string }>) {
    const found = rows.length ? await this.prisma.assetLease.findMany({ where: { renewsLeaseId: { in: rows.map((row) => row.id) }, status: { in: [...OPEN_LEASE_STATUSES, 'APPROVED'] } }, select: { id: true, status: true, renewsLeaseId: true } }) : [];
    return new Map(found.map((lease) => [lease.renewsLeaseId!, { id: lease.id, status: lease.status }]));
  }

  /**
   * The tenant asks to renew an approved lease: a new request for the same unit from the day after it ends, with the
   * same use and, unless the tenant offers other rent, the same rent and deposits. It then goes through the same
   * negotiation, Legal and Shariah review and agreement as any lease. The unit need not be listed: it is theirs now.
   */
  async renewLease(actor: AuthenticatedUser, id: string, input: RenewLeaseDto) {
    const lease = await this.findLease(actor, id);
    if (this.partyOf(actor, lease) !== 'TENANT') throw new ForbiddenException('Only the tenant can ask to renew.');
    if (lease.status !== 'APPROVED' || day(lease.endDate)! < day(new Date())!) throw new BadRequestException('Only a running approved lease can be renewed.');
    const organisation = await this.prisma.organisation.findUnique({ where: { id: actor.organisationId }, select: { kybStatus: true } });
    if (organisation?.kybStatus !== 'APPROVED') throw new BadRequestException('Your company must pass business verification (KYB) before it can rent space.');
    if (lease.unit.asset.status !== 'VERIFIED') throw new BadRequestException('Only a verified asset can be leased out.');
    if (input.termMonths < lease.unit.minTermMonths) throw new BadRequestException(`The owner leases this unit for at least ${lease.unit.minTermMonths} months.`);
    const existing = (await this.renewals([lease])).get(lease.id);
    if (existing) throw new ConflictException(`This lease is already being renewed (${existing.id}).`);

    const start = new Date(lease.endDate.getTime() + 24 * 60 * 60 * 1000);
    const monthlyRent = input.monthlyRent ?? Number(lease.monthlyRent);
    const terms = this.terms(start, input.termMonths, monthlyRent, Number(lease.depositAmount), Number(lease.utilityDepositAmount), Number(lease.renovationDepositAmount));
    await this.assertUnitFree({ id: '', unitId: lease.unitId, startDate: start, endDate: new Date(terms.endDate) });
    const entry = { ...this.entry(actor, 'TENANT', 'PROPOSED', input.message), terms, statement: `Renewal of ${lease.id}. Declared that its business and its use of the space are Shariah-compliant.` };
    const created = await this.prisma.assetLease.create({
      data: {
        id: newCountryScopedId('LEASE', lease.countryNodeId), unitId: lease.unitId, assetId: lease.assetId, countryNodeId: lease.countryNodeId,
        ownerOrganisationId: lease.ownerOrganisationId, tenantOrganisationId: lease.tenantOrganisationId, status: 'PROPOSED', awaiting: 'OWNER', renewsLeaseId: lease.id,
        monthlyRent, currency: lease.currency, depositAmount: terms.depositAmount, utilityDepositAmount: terms.utilityDepositAmount, renovationDepositAmount: terms.renovationDepositAmount, utilitiesPaidBy: lease.utilitiesPaidBy, startDate: start, endDate: new Date(terms.endDate),
        intendedUse: lease.intendedUse, tenantActivity: lease.tenantActivity, history: [entry] as unknown as Prisma.InputJsonValue, createdBy: actor.userId,
      },
      include: LEASE_INCLUDE,
    });
    await this.record(actor, 'asset_lease.renewal_request', created);
    await this.notifyParty(created, 'OWNER', 'A tenant asks to renew', `${await this.tenantName(created)} asks to renew ${created.unit.label}, ${created.unit.asset.name}, from ${terms.startDate} for ${terms.termMonths} months at ${money(created.currency, monthlyRent)} a month (${created.id}, renewing ${lease.id}).`);
    return this.getLease(actor, created.id);
  }

  /** A company asks to rent a listed unit, from a start date for a number of months. */
  async createLease(actor: AuthenticatedUser, input: CreateLeaseDto) {
    if (!TENANT_ROLES.has(actor.role)) throw new ForbiddenException('Only a company (Organization Admin, Corporate Investor, Project Sponsor or Project Manager) can ask to rent space.');
    const organisation = await this.prisma.organisation.findUnique({ where: { id: actor.organisationId }, select: { kybStatus: true } });
    if (organisation?.kybStatus !== 'APPROVED') throw new BadRequestException('Your company must pass business verification (KYB) before it can rent space.');
    const unit = await this.prisma.leasableUnit.findFirst({ where: { id: input.unitId, countryNodeId: actor.countryNodeId, status: 'LISTED' }, include: { asset: UNIT_ASSET } });
    if (!unit || unit.asset.status !== 'VERIFIED') throw new NotFoundException('This unit is not offered for rent.');
    if (unit.organisationId === actor.organisationId) throw new BadRequestException('This unit belongs to your own organisation.');
    if (input.termMonths < unit.minTermMonths) throw new BadRequestException(`The owner leases this unit for at least ${unit.minTermMonths} months.`);
    const start = this.startDate(input.startDate);
    if (unit.availableFrom && start < unit.availableFrom) throw new BadRequestException(`This unit is available from ${day(unit.availableFrom)}.`);
    const open = await this.prisma.assetLease.findFirst({ where: { unitId: unit.id, tenantOrganisationId: actor.organisationId, status: { in: OPEN_LEASE_STATUSES } }, select: { id: true } });
    if (open) throw new ConflictException(`Your company already has a request for this unit (${open.id}).`);

    const monthlyRent = input.monthlyRent ?? Number(unit.monthlyRent);
    const terms = this.terms(start, input.termMonths, monthlyRent, depositFor(monthlyRent, Number(unit.depositMonths)), depositFor(monthlyRent, Number(unit.utilityDepositMonths)), Number(unit.renovationDeposit));
    await this.assertUnitFree({ id: '', unitId: unit.id, startDate: start, endDate: new Date(terms.endDate) });
    const entry = { ...this.entry(actor, 'TENANT', 'PROPOSED', input.message), terms, statement: 'Declared that its business and its use of the space are Shariah-compliant.' };
    const created = await this.prisma.assetLease.create({
      data: {
        id: newCountryScopedId('LEASE', actor.countryNodeId), unitId: unit.id, assetId: unit.assetId, countryNodeId: unit.countryNodeId,
        ownerOrganisationId: unit.organisationId, tenantOrganisationId: actor.organisationId, status: 'PROPOSED', awaiting: 'OWNER',
        monthlyRent, currency: unit.currency, depositAmount: terms.depositAmount, utilityDepositAmount: terms.utilityDepositAmount, renovationDepositAmount: terms.renovationDepositAmount, utilitiesPaidBy: unit.utilitiesPaidBy, startDate: start, endDate: new Date(terms.endDate),
        intendedUse: input.intendedUse, tenantActivity: input.tenantActivity, history: [entry] as unknown as Prisma.InputJsonValue, createdBy: actor.userId,
      },
      include: LEASE_INCLUDE,
    });
    await this.record(actor, 'asset_lease.request', created);
    await this.notifyParty(created, 'OWNER', 'A company asks to rent your space', `${await this.tenantName(created)} asks to rent ${created.unit.label}, ${created.unit.asset.name}, from ${terms.startDate} for ${terms.termMonths} months at ${money(created.currency, monthlyRent)} a month (${created.id}).`);
    return this.getLease(actor, created.id);
  }

  /** The side whose turn it is accepts, declines or counters with other rent, deposit or dates. */
  async respond(actor: AuthenticatedUser, id: string, input: RespondLeaseDto) {
    const lease = await this.findLease(actor, id);
    const party = this.partyOf(actor, lease);
    if (!party) throw new ForbiddenException('Only the owner or the tenant can respond.');
    if (lease.status !== 'PROPOSED') throw new BadRequestException('This request is no longer open for a response.');
    if (lease.awaiting !== party) throw new BadRequestException('Waiting for the other side to respond.');
    const history = lease.history as unknown as LeaseHistoryEntry[];
    const current = this.terms(lease.startDate, leaseTermMonths(lease.startDate, lease.endDate), Number(lease.monthlyRent), Number(lease.depositAmount), Number(lease.utilityDepositAmount), Number(lease.renovationDepositAmount));
    let data: Prisma.AssetLeaseUpdateManyMutationInput;
    let notice: [string, string];
    const what = `${lease.unit.label}, ${lease.unit.asset.name}`;

    if (input.action === 'ACCEPT') {
      if (input.confirmed !== true) throw new BadRequestException('Confirm that you accept these terms on behalf of your organisation.');
      await this.assertUnitFree(lease);
      const organisation = party === 'OWNER' ? lease.unit.asset.organisation.name : await this.tenantName(lease);
      data = { status: 'ACCEPTED', awaiting: 'REVIEW', history: [...history, { ...this.entry(actor, party, 'ACCEPTED', input.note), terms: current, statement: `Accepted these terms on behalf of ${organisation}.` }] as unknown as Prisma.InputJsonValue };
      notice = ['Lease terms accepted', `${what}: the terms were accepted and now go to Legal and Shariah review.`];
    } else if (input.action === 'DECLINE') {
      data = { status: 'DECLINED', awaiting: 'NONE', history: [...history, this.entry(actor, party, 'DECLINED', input.note)] as unknown as Prisma.InputJsonValue };
      notice = ['Lease request declined', `${what} was declined.${input.note ? ` ${input.note}` : ''}`];
    } else {
      const start = input.startDate ? this.startDate(input.startDate) : lease.startDate;
      const termMonths = input.termMonths ?? current.termMonths;
      if (termMonths < lease.unit.minTermMonths && party === 'TENANT') throw new BadRequestException(`The owner leases this unit for at least ${lease.unit.minTermMonths} months.`);
      const monthlyRent = input.monthlyRent ?? current.monthlyRent;
      // A deposit not given follows the new rent (in months, as the unit sets it) or stays as it was.
      const rentChanged = input.monthlyRent !== undefined;
      const terms = this.terms(start, termMonths, monthlyRent,
        input.depositAmount ?? (rentChanged ? depositFor(monthlyRent, Number(lease.unit.depositMonths)) : current.depositAmount),
        input.utilityDepositAmount ?? (rentChanged ? depositFor(monthlyRent, Number(lease.unit.utilityDepositMonths)) : current.utilityDepositAmount),
        input.renovationDepositAmount ?? current.renovationDepositAmount);
      if (JSON.stringify(terms) === JSON.stringify(current)) throw new BadRequestException('This counter-offer changes nothing. Change the terms, or accept or decline them.');
      data = {
        monthlyRent: terms.monthlyRent, depositAmount: terms.depositAmount, utilityDepositAmount: terms.utilityDepositAmount, renovationDepositAmount: terms.renovationDepositAmount, startDate: start, endDate: new Date(terms.endDate), awaiting: otherLeaseParty(party),
        history: [...history, { ...this.entry(actor, party, 'COUNTERED', input.note), terms }] as unknown as Prisma.InputJsonValue,
      };
      notice = ['New lease terms proposed', `${what}: ${money(lease.currency, terms.monthlyRent)} a month, deposit ${money(lease.currency, terms.depositAmount)}, ${terms.termMonths} months from ${terms.startDate}.${terms.utilityDepositAmount || terms.renovationDepositAmount ? ` Utility deposit ${money(lease.currency, terms.utilityDepositAmount)}, renovation deposit ${money(lease.currency, terms.renovationDepositAmount)}.` : ''}`];
    }
    // Claimed atomically, so two people on the same side cannot both respond.
    const claimed = await this.prisma.assetLease.updateMany({ where: { id, status: 'PROPOSED', awaiting: party }, data });
    if (!claimed.count) throw new ConflictException('Someone already responded. Refresh to see the latest.');
    const updated = await this.prisma.assetLease.findUniqueOrThrow({ where: { id }, include: LEASE_INCLUDE });
    await this.record(actor, `asset_lease.${input.action.toLowerCase()}`, updated);
    await this.notifyParty(updated, otherLeaseParty(party), ...notice);
    if (input.action === 'ACCEPT') await this.notifyReviewers(updated);
    return this.getLease(actor, id);
  }

  /** Either side may withdraw before Legal and Shariah approve; the side whose turn it is declines instead. */
  async withdraw(actor: AuthenticatedUser, id: string, input: LeaseNoteDto) {
    const lease = await this.findLease(actor, id);
    const party = this.partyOf(actor, lease);
    if (!party) throw new ForbiddenException('Only the owner or the tenant can withdraw.');
    if (!OPEN_LEASE_STATUSES.includes(lease.status)) throw new BadRequestException('Only a request still being discussed or reviewed can be withdrawn.');
    if (lease.status === 'PROPOSED' && lease.awaiting === party) throw new BadRequestException('It is your turn to respond: decline it instead.');
    const history = [...(lease.history as unknown as LeaseHistoryEntry[]), this.entry(actor, party, 'WITHDRAWN', input.note)];
    const claimed = await this.prisma.assetLease.updateMany({ where: { id, status: { in: OPEN_LEASE_STATUSES } }, data: { status: 'WITHDRAWN', awaiting: 'NONE', history: history as unknown as Prisma.InputJsonValue } });
    if (!claimed.count) throw new ConflictException('This request changed meanwhile. Refresh to see the latest.');
    const updated = await this.prisma.assetLease.findUniqueOrThrow({ where: { id }, include: LEASE_INCLUDE });
    await this.record(actor, 'asset_lease.withdraw', updated);
    await this.notifyParty(updated, otherLeaseParty(party), 'Lease request withdrawn', `${updated.unit.label}, ${updated.unit.asset.name} was withdrawn.`);
    return this.getLease(actor, id);
  }

  /**
   * Legal and Shariah each approve once, by different people, neither from either party; one rejection
   * ends it, and a request for changes sends it back to the parties. The second approval sets the rent schedule.
   */
  async review(actor: AuthenticatedUser, id: string, input: ReviewLeaseDto) {
    if (!REVIEWERS.has(actor.role)) throw new ForbiddenException('Only Legal and Shariah reviewers can approve leases.');
    const lease = await this.findLease(actor, id);
    if (lease.status !== 'ACCEPTED') throw new BadRequestException('Only an accepted lease awaits review.');
    if (actor.organisationId === lease.ownerOrganisationId || actor.organisationId === lease.tenantOrganisationId) throw new ForbiddenException('You cannot review a lease your own organisation is part of.');
    const track = this.trackFor(actor, input.track);
    if (track === 'LEGAL' ? lease.legalApprovedBy : lease.shariahApprovedBy) throw new ConflictException(`The ${track === 'LEGAL' ? 'Legal' : 'Shariah'} approval is already given.`);
    if ((track === 'LEGAL' ? lease.shariahApprovedBy : lease.legalApprovedBy) === actor.userId) throw new ForbiddenException('The Legal and Shariah approvals must be given by different people.');

    const history = lease.history as unknown as LeaseHistoryEntry[];
    const label = track === 'LEGAL' ? 'Legal' : 'Shariah';
    const flags = shariahFlags(lease.intendedUse, lease.tenantActivity);
    // Approving the akad over a flagged activity needs the reviewer to say why it is permissible.
    if (input.decision === 'APPROVE' && track === 'SHARIAH' && flags.length && input.note.length < 20) throw new BadRequestException(`The tenant's activity may involve ${flags.join(', ')}. Explain in the note why the lease is permissible.`);
    const decided = (action: string) => ({ ...this.entry(actor, 'REVIEW', action, input.note), ...(flags.length ? { statement: `Activity flags when decided: ${flags.join(', ')}.` } : {}) });
    const field = track === 'LEGAL' ? { legalApprovedBy: null } : { shariahApprovedBy: null };
    let data: Prisma.AssetLeaseUpdateManyMutationInput;
    let finished = false;
    if (input.decision === 'REJECT') {
      data = { status: 'REJECTED', awaiting: 'NONE', history: [...history, decided(`${track}_REJECTED`)] as unknown as Prisma.InputJsonValue };
    } else if (input.decision === 'REQUEST_CHANGES') {
      // Back to the owner, who counters with corrected terms; the tenant then accepts and both reviews start again.
      data = { status: 'PROPOSED', awaiting: 'OWNER', legalApprovedBy: null, legalApprovedAt: null, shariahApprovedBy: null, shariahApprovedAt: null, history: [...history, decided(`${track}_CHANGES_REQUESTED`)] as unknown as Prisma.InputJsonValue };
    } else {
      const now = new Date();
      finished = Boolean(track === 'LEGAL' ? lease.shariahApprovedBy : lease.legalApprovedBy);
      if (finished) await this.assertUnitFree(lease);
      data = {
        ...(track === 'LEGAL' ? { legalApprovedBy: actor.userId, legalApprovedAt: now } : { shariahApprovedBy: actor.userId, shariahApprovedAt: now }),
        ...(finished ? { status: 'APPROVED', awaiting: 'NONE' } : {}),
        history: [...history, decided(`${track}_APPROVED`)] as unknown as Prisma.InputJsonValue,
      };
    }
    const claimed = await this.prisma.assetLease.updateMany({ where: { id, status: 'ACCEPTED', ...field }, data });
    if (!claimed.count) throw new ConflictException('Someone already reviewed this. Refresh to see the latest.');
    if (finished) {
      const schedule = rentSchedule(lease.startDate, leaseTermMonths(lease.startDate, lease.endDate), Number(lease.monthlyRent));
      await this.prisma.leaseRentPayment.createMany({ data: schedule.map((row) => ({ leaseId: id, period: row.period, dueDate: new Date(row.dueDate), amount: row.amount, currency: lease.currency })), skipDuplicates: true });
    }
    const updated = await this.prisma.assetLease.findUniqueOrThrow({ where: { id }, include: LEASE_INCLUDE });
    await this.record(actor, `asset_lease.${track.toLowerCase()}_${input.decision.toLowerCase()}`, updated);
    const what = `${updated.unit.label}, ${updated.unit.asset.name}`;
    const [title, message] = input.decision === 'REJECT'
      ? [`Lease rejected by ${label}`, `${what}: ${input.note}`]
      : input.decision === 'REQUEST_CHANGES'
        ? [`${label} review: changes requested`, `${what}: ${input.note} The owner proposes corrected terms; once the tenant accepts, it is reviewed again.`]
        : finished
          ? ['Lease approved', `${what} is leased from ${day(updated.startDate)} to ${day(updated.endDate)} at ${money(updated.currency, Number(updated.monthlyRent))} a month. Sign the Ijarah agreement; the first month's rent and the deposit are paid to the owner's bank account.`]
          : [`${label} approval given`, `${what} now awaits the ${track === 'LEGAL' ? 'Shariah' : 'Legal'} approval.`];
    await this.notifyParty(updated, 'OWNER', title, message);
    await this.notifyParty(updated, 'TENANT', title, message);
    return this.getLease(actor, id);
  }

  /** The owner records a month's rent as received in their bank account. */
  async recordPayment(actor: AuthenticatedUser, id: string, period: string, input: RecordRentPaymentDto) {
    const lease = await this.findLease(actor, id);
    if (this.partyOf(actor, lease) !== 'OWNER') throw new ForbiddenException('Only the owner records rent received.');
    if (!['APPROVED', 'ENDED'].includes(lease.status)) throw new BadRequestException('Rent is recorded only for an approved lease.');
    const paidAt = input.paidAt ? new Date(input.paidAt) : new Date();
    if (paidAt > new Date()) throw new BadRequestException('The payment date cannot be in the future.');
    const claimed = await this.prisma.leaseRentPayment.updateMany({ where: { leaseId: id, period, status: 'DUE' }, data: { status: 'PAID', paidAt, reference: input.reference, recordedBy: actor.userId } });
    if (!claimed.count) throw new ConflictException('This month is not due, or is already recorded as paid.');
    await this.audit.recordActor(actor, { action: 'asset_lease.rent_received', resourceType: 'AssetLease', resourceId: id, organisationId: actor.organisationId, countryNodeId: lease.countryNodeId, metadata: { period, reference: input.reference, paidAt: paidAt.toISOString() } });
    const payment = lease.payments.find((row) => row.period === period);
    await this.notifyParty(lease, 'TENANT', 'Rent received', `${lease.unit.label}, ${lease.unit.asset.name}: the owner recorded ${payment ? money(payment.currency, Number(payment.amount)) : 'the rent'} for ${period} as received (reference ${input.reference}).`);
    return this.getLease(actor, id);
  }

  /** Ends an approved lease early, as the parties agreed; months after the end that are still due are removed. */
  async endLease(actor: AuthenticatedUser, id: string, input: EndLeaseDto) {
    const lease = await this.findLease(actor, id);
    const party = this.partyOf(actor, lease);
    if (party !== 'OWNER') throw new ForbiddenException('Only the owner records the end of a lease.');
    if (lease.status !== 'APPROVED') throw new BadRequestException('Only an approved lease can be ended.');
    const now = new Date();
    const history = [...(lease.history as unknown as LeaseHistoryEntry[]), this.entry(actor, party, 'ENDED', input.note)];
    const claimed = await this.prisma.assetLease.updateMany({ where: { id, status: 'APPROVED' }, data: { status: 'ENDED', endedAt: now, awaiting: 'NONE', history: history as unknown as Prisma.InputJsonValue } });
    if (!claimed.count) throw new ConflictException('This lease changed meanwhile. Refresh to see the latest.');
    await this.prisma.leaseRentPayment.deleteMany({ where: { leaseId: id, status: 'DUE', dueDate: { gt: now } } });
    const updated = await this.prisma.assetLease.findUniqueOrThrow({ where: { id }, include: LEASE_INCLUDE });
    await this.record(actor, 'asset_lease.end', updated);
    await this.notifyParty(updated, 'TENANT', 'Lease ended', `${updated.unit.label}, ${updated.unit.asset.name}: the owner recorded the lease as ended. ${input.note}`);
    return this.getLease(actor, id);
  }

  /** The owner records the tenant's security deposit as received in their bank account. */
  async recordDeposit(actor: AuthenticatedUser, id: string, input: RecordDepositDto) {
    const lease = await this.findLease(actor, id);
    if (this.partyOf(actor, lease) !== 'OWNER') throw new ForbiddenException('Only the owner records the deposit received.');
    if (lease.status !== 'APPROVED') throw new BadRequestException('The deposit is recorded for an approved lease.');
    const receivedAt = input.receivedAt ? new Date(input.receivedAt) : new Date();
    if (receivedAt > new Date()) throw new BadRequestException('The date received cannot be in the future.');
    const claimed = await this.prisma.assetLease.updateMany({ where: { id, depositReceivedAt: null }, data: { depositReceivedAt: receivedAt, depositReference: input.reference } });
    if (!claimed.count) throw new ConflictException('The deposit is already recorded as received.');
    const amounts = this.depositAmounts(lease);
    const total = amounts.SECURITY + amounts.UTILITY + amounts.RENOVATION;
    await this.audit.recordActor(actor, { action: 'asset_lease.deposit_received', resourceType: 'AssetLease', resourceId: id, organisationId: actor.organisationId, countryNodeId: lease.countryNodeId, metadata: { amount: total, security: amounts.SECURITY, utility: amounts.UTILITY, renovation: amounts.RENOVATION, reference: input.reference, receivedAt: receivedAt.toISOString() } });
    await this.notifyParty(lease, 'TENANT', 'Deposit received', `${lease.unit.label}, ${lease.unit.asset.name}: the owner recorded your deposit of ${money(lease.currency, total)} as received (reference ${input.reference}).`);
    return this.getLease(actor, id);
  }

  /**
   * The owner refunds one deposit, less reasoned deductions: the security and utility deposits after the lease
   * (within 30 days, the agreement says), the renovation deposit once the fit-out is done and inspected.
   */
  async returnDeposit(actor: AuthenticatedUser, id: string, input: ReturnDepositDto) {
    const lease = await this.findLease(actor, id);
    if (this.partyOf(actor, lease) !== 'OWNER') throw new ForbiddenException('Only the owner refunds the deposit.');
    if (!lease.depositReceivedAt) throw new BadRequestException('Record the deposit as received first.');
    const amounts = this.depositAmounts(lease);
    const refunds = this.refunds(lease);
    if (!amounts[input.kind]) throw new BadRequestException('This lease holds no such deposit.');
    if (refunds.some((refund) => refund.kind === input.kind)) throw new ConflictException('This deposit is already recorded as refunded.');
    if (!refundableDeposits({ status: lease.status, endDate: lease.endDate, received: true, amounts, refunds }, new Date()).includes(input.kind)) throw new BadRequestException('The security and utility deposits are refunded after the lease ends.');
    const { amount, problem } = depositRefund(amounts[input.kind], input.deductions);
    if (problem) throw new BadRequestException(problem);
    const paidAt = input.paidAt ? new Date(input.paidAt) : new Date();
    if (paidAt > new Date()) throw new BadRequestException('The payment date cannot be in the future.');
    const refund: DepositRefund = { kind: input.kind, amount, reference: input.reference, paidAt: paidAt.toISOString(), deductions: input.deductions.map((item) => ({ reason: item.reason, amount: item.amount })) };
    const next = [...refunds, refund];
    const allDone = (Object.keys(amounts) as DepositKind[]).every((kind) => !amounts[kind] || next.some((item) => item.kind === kind));
    // Conditional on the lease as read, so two refunds recorded at once cannot overwrite each other.
    const claimed = await this.prisma.assetLease.updateMany({ where: { id, updatedAt: lease.updatedAt }, data: { depositRefunds: next as unknown as Prisma.InputJsonValue, ...(allDone ? { depositReturnedAt: paidAt } : {}) } });
    if (!claimed.count) throw new ConflictException('The lease changed meanwhile. Reload and try again.');
    await this.audit.recordActor(actor, { action: 'asset_lease.deposit_refunded', resourceType: 'AssetLease', resourceId: id, organisationId: actor.organisationId, countryNodeId: lease.countryNodeId, metadata: { deposit: amounts[input.kind], ...refund } });
    const kindName = { SECURITY: 'security deposit', UTILITY: 'utility deposit', RENOVATION: 'renovation deposit' }[input.kind];
    const deducted = refund.deductions.length ? ` after deductions of ${money(lease.currency, amounts[input.kind] - amount)} (${refund.deductions.map((item) => item.reason).join('; ')})` : '';
    await this.notifyParty(lease, 'TENANT', 'Deposit refunded', `${lease.unit.label}, ${lease.unit.asset.name}: the owner refunded ${money(lease.currency, amount)} of your ${kindName}${deducted} (reference ${input.reference}).`);
    return this.getLease(actor, id);
  }

  private depositAmounts(lease: { depositAmount: Prisma.Decimal; utilityDepositAmount: Prisma.Decimal; renovationDepositAmount: Prisma.Decimal }) {
    return depositsOf({ depositAmount: Number(lease.depositAmount), utilityDepositAmount: Number(lease.utilityDepositAmount), renovationDepositAmount: Number(lease.renovationDepositAmount) });
  }

  private refunds(lease: { depositRefunds: Prisma.JsonValue }): DepositRefund[] {
    return Array.isArray(lease.depositRefunds) ? (lease.depositRefunds as unknown as DepositRefund[]) : [];
  }

  /**
   * Once a day: rent due in three days or today, rent 1, 7, 14 and 30 days late (the owner is told too),
   * leases ending in 60 and 30 days, and deposits not yet refunded as the 30-day limit nears or passes.
   * Each reminder is sent once: its dedupe key names the stage it reached.
   */
  async remindDue(now = new Date()): Promise<number> {
    if (!this.notifications) return 0;
    let sent = 0;
    const soon = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);
    const payments = await this.prisma.leaseRentPayment.findMany({ where: { status: 'DUE', dueDate: { lte: soon }, lease: { status: 'APPROVED' } }, include: { lease: { include: LEASE_INCLUDE } } });
    for (const payment of payments) {
      const reminder = rentReminder(payment.dueDate, now);
      if (!reminder) continue;
      const lease = payment.lease;
      const what = `${lease.unit.label}, ${lease.unit.asset.name}`;
      const amount = money(payment.currency, Number(payment.amount));
      const tenant = { userId: lease.createdBy, organisationId: lease.tenantOrganisationId };
      const owner = { userId: lease.unit.asset.ownerUserId, organisationId: lease.ownerOrganisationId };
      if (reminder.stage === 'OVERDUE') {
        await this.remind(lease, [tenant], `lease-rent:${payment.id}:overdue-${reminder.days}`, 'Rent overdue', `${what}: the rent of ${amount} due on ${day(payment.dueDate)} is ${reminder.days} day(s) late. Pay it to the owner's bank account; the owner records it once received.`);
        await this.remind(lease, [owner], `lease-rent-owner:${payment.id}:overdue-${reminder.days}`, 'Rent not received', `${what}: the rent of ${amount} due on ${day(payment.dueDate)} is not recorded as received, ${reminder.days} day(s) after it was due. If it reached your account, record it.`);
      } else {
        await this.remind(lease, [tenant], `lease-rent:${payment.id}:${reminder.stage}`, reminder.stage === 'DUE_TODAY' ? 'Rent due today' : 'Rent due soon', `${what}: the rent of ${amount} for ${payment.period} is due on ${day(payment.dueDate)}. Pay it to the owner's bank account.`);
      }
      sent += 1;
    }
    const ending = await this.prisma.assetLease.findMany({ where: { status: 'APPROVED', endDate: { gte: now, lte: new Date(now.getTime() + 61 * 24 * 60 * 60 * 1000) } }, include: LEASE_INCLUDE });
    for (const lease of ending) {
      const stage = endingReminder(lease.endDate, now);
      if (!stage) continue;
      const what = `${lease.unit.label}, ${lease.unit.asset.name}`;
      const parties = [{ userId: lease.createdBy, organisationId: lease.tenantOrganisationId }, { userId: lease.unit.asset.ownerUserId, organisationId: lease.ownerOrganisationId }];
      await this.remind(lease, parties, `lease-ending:${lease.id}:${stage}`, 'Lease ending soon', `${what}: the lease ends on ${day(lease.endDate)}, in ${daysUntil(lease.endDate, now)} days. To continue, the tenant asks for a new lease; otherwise the space is handed back on that day.`);
      sent += 1;
    }
    const unrefunded = await this.prisma.assetLease.findMany({ where: { depositReceivedAt: { not: null }, depositReturnedAt: null, OR: [{ status: 'ENDED' }, { status: 'APPROVED', endDate: { lt: now } }] }, include: LEASE_INCLUDE });
    for (const lease of unrefunded) {
      const dueBy = depositRefundDueBy(lease);
      const left = daysUntil(dueBy, now);
      if (left > 7) continue;
      const amounts = this.depositAmounts(lease);
      const refunded = this.refunds(lease);
      const outstanding = (Object.keys(amounts) as DepositKind[]).filter((kind) => !refunded.some((refund) => refund.kind === kind)).reduce((total, kind) => total + amounts[kind], 0);
      if (!outstanding) continue;
      const what = `${lease.unit.label}, ${lease.unit.asset.name}`;
      const owner = { userId: lease.unit.asset.ownerUserId, organisationId: lease.ownerOrganisationId };
      await this.remind(lease, [owner], `lease-deposit:${lease.id}:${left < 0 ? 'late' : 'soon'}`, left < 0 ? 'Deposit refund overdue' : 'Deposit refund due', `${what}: refund the deposit of ${money(lease.currency, outstanding)} by ${day(dueBy)}, less only unpaid rent and repairs beyond fair wear and tear, and record it in Leasing.`);
      sent += 1;
    }
    return sent;
  }

  // ---- Helpers ----

  private assertOwner(actor: AuthenticatedUser) {
    if (!ASSET_OWNER_ROLES.has(actor.role)) throw new ForbiddenException('Only an asset owner can list space for rent.');
  }

  /** A start date as a calendar day, not earlier than today. */
  private startDate(value: string): Date {
    const start = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
    if (Number.isNaN(start.getTime())) throw new BadRequestException('Give a valid start date.');
    if (day(start)! < day(new Date())!) throw new BadRequestException('The start date cannot be in the past.');
    return start;
  }

  private terms(start: Date, termMonths: number, monthlyRent: number, depositAmount: number, utilityDepositAmount = 0, renovationDepositAmount = 0) {
    return { monthlyRent, depositAmount, utilityDepositAmount, renovationDepositAmount, startDate: day(start)!, endDate: day(leaseEndDate(start, termMonths))!, termMonths };
  }

  private leaseScope(actor: AuthenticatedUser): Prisma.AssetLeaseWhereInput {
    if (actor.role === 'Super Admin') return {};
    if (REVIEWERS.has(actor.role)) return { countryNodeId: actor.countryNodeId };
    if (ASSET_OWNER_ROLES.has(actor.role)) return { countryNodeId: actor.countryNodeId, ownerOrganisationId: actor.organisationId };
    if (TENANT_ROLES.has(actor.role)) return { countryNodeId: actor.countryNodeId, tenantOrganisationId: actor.organisationId };
    throw new ForbiddenException('Leases are for asset owners, tenants and reviewers.');
  }

  private async findLease(actor: AuthenticatedUser, id: string): Promise<LeaseRow> {
    const lease = await this.prisma.assetLease.findFirst({ where: { id, ...this.leaseScope(actor) }, include: LEASE_INCLUDE });
    if (!lease) throw new NotFoundException('Lease not found.');
    return lease;
  }

  private partyOf(actor: AuthenticatedUser, lease: { ownerOrganisationId: string; tenantOrganisationId: string }): LeaseParty | null {
    if (ASSET_OWNER_ROLES.has(actor.role) && actor.organisationId === lease.ownerOrganisationId) return 'OWNER';
    if (TENANT_ROLES.has(actor.role) && actor.organisationId === lease.tenantOrganisationId) return 'TENANT';
    return null;
  }

  private trackFor(actor: AuthenticatedUser, requested?: 'LEGAL' | 'SHARIAH'): 'LEGAL' | 'SHARIAH' {
    if (actor.role === 'Super Admin') {
      if (!requested) throw new BadRequestException('Say whether this is the Legal or the Shariah approval.');
      return requested;
    }
    return SHARIAH_REVIEWERS.has(actor.role) ? 'SHARIAH' : 'LEGAL';
  }

  /** The unit may not be held by another accepted or approved lease for an overlapping period. */
  private async assertUnitFree(lease: { id: string; unitId: string; startDate: Date; endDate: Date }) {
    const clash = await this.prisma.assetLease.findFirst({ where: { unitId: lease.unitId, id: { not: lease.id }, status: { in: HOLDING_LEASE_STATUSES }, startDate: { lte: lease.endDate }, endDate: { gte: lease.startDate } }, select: { id: true, startDate: true, endDate: true } });
    if (clash) throw new ConflictException(`The unit is already taken from ${day(clash.startDate)} to ${day(clash.endDate)}. Choose other dates.`);
  }

  private entry(actor: AuthenticatedUser, party: LeaseParty | 'REVIEW', action: string, note?: string): LeaseHistoryEntry {
    return { at: new Date().toISOString(), by: actor.userId, byName: actor.name, party, action, ...(note ? { note } : {}) };
  }

  /**
   * The other side's contact person, for the two parties of an approved (or ended) lease only: the owner sees
   * who asked for the lease at the tenant company, the tenant sees the asset's owner. Nobody else, and not before
   * both sides are bound, so a request does not hand out anyone's phone number.
   */
  private async contacts(actor: AuthenticatedUser, rows: LeaseRow[]) {
    const wanted = rows.flatMap((row) => {
      const party = this.partyOf(actor, row);
      if (!party || !['APPROVED', 'ENDED'].includes(row.status)) return [];
      return [{ leaseId: row.id, userId: party === 'OWNER' ? row.createdBy : row.unit.asset.ownerUserId }];
    });
    const users = wanted.length ? await this.prisma.user.findMany({ where: { id: { in: [...new Set(wanted.map((item) => item.userId))] } }, select: { id: true, name: true, email: true, profile: true } }) : [];
    return new Map(wanted.map((item) => {
      const user = users.find((candidate) => candidate.id === item.userId);
      const phone = (user?.profile as { phone?: unknown } | null)?.phone;
      return [item.leaseId, user ? { name: user.name, email: user.email, phone: typeof phone === 'string' ? phone : null } : null] as const;
    }));
  }

  private async tenantNames(rows: Array<{ tenantOrganisationId: string }>) {
    const ids = [...new Set(rows.map((row) => row.tenantOrganisationId))];
    const organisations = ids.length ? await this.prisma.organisation.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }) : [];
    return new Map(organisations.map((organisation) => [organisation.id, organisation.name]));
  }

  private async tenantName(row: { tenantOrganisationId: string }) {
    return (await this.tenantNames([row])).get(row.tenantOrganisationId) ?? 'A company';
  }

  /** A unit as listed; companies browsing see the area, not the street address. */
  private unitView(unit: { id: string; assetId: string; label: string; description: string; floorArea: Prisma.Decimal | null; floorAreaUnit: string; monthlyRent: Prisma.Decimal; currency: string; depositMonths: Prisma.Decimal; utilityDepositMonths: Prisma.Decimal; renovationDeposit: Prisma.Decimal; utilitiesPaidBy: string; minTermMonths: number; availableFrom: Date | null; permittedUse: string; status: string }, asset: { name: string; assetType: string; location: string; details: Prisma.JsonValue; organisation: { name: string } }, forTenant = false) {
    const details = asset.details as AssetDetails | null;
    return {
      id: unit.id,
      assetId: unit.assetId,
      label: unit.label,
      description: unit.description,
      floorArea: unit.floorArea === null ? null : Number(unit.floorArea),
      floorAreaUnit: unit.floorAreaUnit,
      monthlyRent: Number(unit.monthlyRent),
      currency: unit.currency,
      depositMonths: Number(unit.depositMonths),
      utilityDepositMonths: Number(unit.utilityDepositMonths),
      renovationDeposit: Number(unit.renovationDeposit),
      utilitiesPaidBy: unit.utilitiesPaidBy,
      minTermMonths: unit.minTermMonths,
      availableFrom: day(unit.availableFrom),
      permittedUse: unit.permittedUse,
      status: unit.status,
      asset: {
        name: asset.name,
        assetType: asset.assetType,
        region: regionOf(details),
        ...(forTenant ? { details: publicDetails(asset.assetType, details) } : { location: asset.location }),
      },
      ownerOrganisationName: asset.organisation.name,
    };
  }

  private view(actor: AuthenticatedUser, row: LeaseRow, tenantNames: Map<string, string>, renewal: { id: string; status: string } | null = null) {
    const party = this.partyOf(actor, row);
    const reviewer = !party && REVIEWERS.has(actor.role);
    const today = new Date();
    const payments = row.payments.map((payment) => ({
      period: payment.period, dueDate: day(payment.dueDate), amount: Number(payment.amount), currency: payment.currency,
      status: isOverdue(payment, today) ? 'OVERDUE' : payment.status, paidAt: day(payment.paidAt), reference: payment.reference,
    }));
    const sum = (status: string) => Math.round(payments.filter((payment) => payment.status === status).reduce((total, payment) => total + payment.amount, 0) * 100) / 100;
    const details = row.unit.asset.details as AssetDetails | null;
    const amounts = this.depositAmounts(row);
    const refunds = this.refunds(row);
    const refundable = refundableDeposits({ status: row.status, endDate: row.endDate, received: Boolean(row.depositReceivedAt), amounts, refunds }, today);
    return {
      id: row.id,
      status: row.status,
      awaiting: row.awaiting,
      myParty: party,
      canRespond: row.status === 'PROPOSED' && party !== null && row.awaiting === party,
      canWithdraw: party !== null && (row.status === 'ACCEPTED' || (row.status === 'PROPOSED' && row.awaiting !== party)),
      canReview: reviewer && row.status === 'ACCEPTED' && actor.organisationId !== row.ownerOrganisationId && actor.organisationId !== row.tenantOrganisationId,
      canRecordPayment: party === 'OWNER' && ['APPROVED', 'ENDED'].includes(row.status),
      canEnd: party === 'OWNER' && row.status === 'APPROVED',
      canRenew: party === 'TENANT' && row.status === 'APPROVED' && day(row.endDate)! >= day(today)! && !renewal,
      renewsLeaseId: row.renewsLeaseId,
      renewal,
      canRecordDeposit: party === 'OWNER' && row.status === 'APPROVED' && !row.depositReceivedAt,
      canReturnDeposit: party === 'OWNER' && refundable.length > 0,
      deposit: {
        amount: amounts.SECURITY,
        utility: amounts.UTILITY,
        renovation: amounts.RENOVATION,
        total: amounts.SECURITY + amounts.UTILITY + amounts.RENOVATION,
        utilitiesPaidBy: row.utilitiesPaidBy,
        receivedAt: day(row.depositReceivedAt),
        reference: row.depositReference,
        returnedAt: day(row.depositReturnedAt),
        refunds,
        // What the owner can refund now (empty for anyone else).
        refundable: party === 'OWNER' ? refundable : [],
        refundDueBy: row.depositReceivedAt && (row.status === 'ENDED' || daysUntil(row.endDate, today) < 0) ? day(depositRefundDueBy(row)) : null,
      },
      unit: { id: row.unit.id, label: row.unit.label, floorArea: row.unit.floorArea === null ? null : Number(row.unit.floorArea), floorAreaUnit: row.unit.floorAreaUnit, permittedUse: row.unit.permittedUse, minTermMonths: row.unit.minTermMonths },
      asset: { id: row.unit.asset.id, name: row.unit.asset.name, assetType: row.unit.asset.assetType, region: regionOf(details), ...(party || reviewer || row.status === 'APPROVED' ? { location: row.unit.asset.location } : {}) },
      ownerOrganisationName: row.unit.asset.organisation.name,
      tenantOrganisationName: tenantNames.get(row.tenantOrganisationId) ?? null,
      monthlyRent: Number(row.monthlyRent),
      depositAmount: Number(row.depositAmount),
      utilityDepositAmount: amounts.UTILITY,
      renovationDepositAmount: amounts.RENOVATION,
      utilitiesPaidBy: row.utilitiesPaidBy,
      currency: row.currency,
      startDate: day(row.startDate),
      endDate: day(row.endDate),
      termMonths: leaseTermMonths(row.startDate, row.endDate),
      intendedUse: row.intendedUse,
      tenantActivity: row.tenantActivity,
      // Shown to the reviewers, who decide on them.
      shariahFlags: reviewer || actor.role === 'Super Admin' ? shariahFlags(row.intendedUse, row.tenantActivity) : undefined,
      legalApprovedAt: row.legalApprovedAt?.toISOString() ?? null,
      shariahApprovedAt: row.shariahApprovedAt?.toISOString() ?? null,
      endedAt: row.endedAt?.toISOString() ?? null,
      history: row.history,
      payments,
      rent: { paid: sum('PAID'), overdue: sum('OVERDUE'), due: sum('DUE') },
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private record(actor: AuthenticatedUser, action: string, lease: { id: string; countryNodeId: string; status: string; unitId: string; monthlyRent: Prisma.Decimal; depositAmount: Prisma.Decimal; startDate: Date; endDate: Date; history: unknown }) {
    const history = Array.isArray(lease.history) ? lease.history : [];
    return this.audit.recordActor(actor, { action, resourceType: 'AssetLease', resourceId: lease.id, organisationId: actor.organisationId, countryNodeId: lease.countryNodeId, metadata: {
      status: lease.status, unitId: lease.unitId, monthlyRent: Number(lease.monthlyRent), depositAmount: Number(lease.depositAmount), startDate: day(lease.startDate), endDate: day(lease.endDate),
      byName: actor.name, role: actor.role, entry: (history[history.length - 1] ?? null) as Prisma.InputJsonValue,
    } });
  }

  /** In-app notice to the asset's owner, or to whoever at the tenant company made the request. */
  private async notifyParty(row: LeaseRow, party: LeaseParty, title: string, message: string) {
    const recipient = party === 'OWNER' ? { userId: row.unit.asset.ownerUserId, organisationId: row.ownerOrganisationId } : { userId: row.createdBy, organisationId: row.tenantOrganisationId };
    await this.send(row, [recipient], title, message);
  }

  private async notifyReviewers(row: LeaseRow) {
    const roles = ['Legal_Officer', 'Shariah_Reviewer', 'Shariah_Advisor', 'Shariah_Committee'] as PrismaUserRole[];
    const reviewers = await this.prisma.userRoleAssignment.findMany({ where: { role: { in: roles }, isActive: true, countryNodeId: row.countryNodeId, organisationId: { notIn: [row.ownerOrganisationId, row.tenantOrganisationId] } }, select: { userId: true, organisationId: true } });
    await this.send(row, reviewers, 'Lease to review', `${row.unit.label}, ${row.unit.asset.name}: Ijarah at ${money(row.currency, Number(row.monthlyRent))} a month from ${day(row.startDate)} to ${day(row.endDate)} (${row.id}).`);
  }

  /** A reminder sent once per stage: the key names the lease, the month or the deadline, and the stage. */
  private async remind(row: LeaseRow, recipients: Array<{ userId: string; organisationId: string }>, key: string, title: string, message: string) {
    await Promise.all(recipients.map((recipient) => this.notifications!.enqueue({
      recipientUserId: recipient.userId, organisationId: recipient.organisationId, countryNodeId: row.countryNodeId, type: 'ASSET_LEASE',
      title, message, resourceType: 'AssetLease', resourceId: row.id, dedupeKey: `${key}:${recipient.userId}`,
    }).catch(() => undefined)));
  }

  private async send(row: LeaseRow, recipients: Array<{ userId: string; organisationId: string }>, title: string, message: string) {
    if (!this.notifications) return;
    const unique = [...new Map(recipients.map((recipient) => [recipient.userId, recipient])).values()];
    await Promise.all(unique.map((recipient) => this.notifications!.enqueue({
      recipientUserId: recipient.userId, organisationId: recipient.organisationId, countryNodeId: row.countryNodeId, type: 'ASSET_LEASE',
      title, message, resourceType: 'AssetLease', resourceId: row.id, dedupeKey: `asset-lease:${row.id}:${recipient.userId}:${title}:${row.updatedAt.toISOString()}`,
    }).catch(() => undefined)));
  }
}
