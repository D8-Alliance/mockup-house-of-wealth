import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { Prisma, RentCollectionCase } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { ASSET_OWNER_ROLES } from '../assets/assets.service';
import { NotificationService } from '../notifications/notification.service';
import { PrismaService } from '../prisma.service';
import { newCountryScopedId } from '../users/user-identity';
import { renderReminderLetter } from './rent-collection-letter';
import { ACTIVE_STAGES, actionDueAfter, addDays, COLLECTION_GRACE_DAYS, CollectionStage, nextReminder, OrganisationDutyCode, ORGANISATION_DUTIES, payBy, REMINDER_NUMBER, shouldOpenCase } from './rent-collection-rules';

const day = (date: Date | null | undefined) => (date ? date.toISOString().slice(0, 10) : null);
const money = (currency: string, amount: number) => `${currency === 'MYR' ? 'RM' : currency} ${amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export interface HistoryEntry { at: string; by: string; byName: string; action: string; stage: CollectionStage; note?: string }
export interface FollowUp { at: string; by: string; byName: string; channel: string; note: string; promiseDate?: string }

const LEASE_SELECT = { id: true, startDate: true, createdBy: true, unit: { select: { label: true, asset: { select: { name: true, ownerUserId: true } } } } } as const;

/**
 * Rent collection for the owner's team (see rent-collection-rules.ts). The people of the owner's organisation hold
 * duties: COLLECTION sends the reminders and follows up, LEGAL takes the case over after the last reminder. The
 * organisation's Asset Owner manages the duties and may act on any case. Tenants receive each reminder and can open
 * its letter.
 */
@Injectable()
export class RentCollectionService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService, @Optional() private readonly notifications?: NotificationService) {}

  // ---- Team: who does what for the owner's leases ----

  /** The owner's people and their duties. Anyone of the owner's organisation may see it; the Asset Owner changes it. */
  async team(actor: AuthenticatedUser) {
    this.assertOwnerStaff(actor);
    const members = await this.members(actor.organisationId);
    const duties = await this.prisma.organisationDuty.findMany({ where: { organisationId: actor.organisationId } });
    return {
      canManage: actor.role === 'Asset Owner',
      members: members.map((member) => ({ ...member, duties: duties.filter((duty) => duty.userId === member.userId).map((duty) => duty.duty) })),
    };
  }

  async setDuty(actor: AuthenticatedUser, input: { userId: string; duty: string; on: boolean }) {
    if (actor.role !== 'Asset Owner') throw new ForbiddenException('Only the Asset Owner of the organisation assigns duties.');
    if (!(ORGANISATION_DUTIES as readonly string[]).includes(input.duty)) throw new BadRequestException('Choose a duty: accounts, statement of account, collection, field or legal.');
    const members = await this.members(actor.organisationId);
    if (!members.some((member) => member.userId === input.userId)) throw new BadRequestException('That person is not part of your organisation.');
    if (input.on) {
      await this.prisma.organisationDuty.upsert({ where: { organisationId_userId_duty: { organisationId: actor.organisationId, userId: input.userId, duty: input.duty } }, create: { organisationId: actor.organisationId, userId: input.userId, duty: input.duty, assignedBy: actor.userId }, update: {} });
    } else {
      await this.prisma.organisationDuty.deleteMany({ where: { organisationId: actor.organisationId, userId: input.userId, duty: input.duty } });
    }
    await this.audit.recordActor(actor, { action: input.on ? 'organisation_duty.assigned' : 'organisation_duty.removed', resourceType: 'OrganisationDuty', resourceId: `${input.userId}:${input.duty}`, organisationId: actor.organisationId, countryNodeId: actor.countryNodeId, metadata: { userId: input.userId, duty: input.duty } });
    return this.team(actor);
  }

  // ---- Cases ----

  async list(actor: AuthenticatedUser) {
    this.assertOwnerStaff(actor);
    await this.closePaid({ ownerOrganisationId: actor.organisationId });
    const rows = await this.prisma.rentCollectionCase.findMany({ where: { ownerOrganisationId: actor.organisationId, countryNodeId: actor.countryNodeId }, orderBy: [{ actionDueAt: 'asc' }], take: 300 });
    return this.views(actor, rows);
  }

  async get(actor: AuthenticatedUser, id: string) {
    const row = await this.findForStaff(actor, id);
    await this.closePaid({ id: row.id });
    return (await this.views(actor, [await this.prisma.rentCollectionCase.findUniqueOrThrow({ where: { id } })]))[0];
  }

  /** The collection team sends the next reminder: the stage moves on, the tenant is told and the letter is ready. */
  async remind(actor: AuthenticatedUser, id: string, note?: string) {
    const row = await this.findForStaff(actor, id);
    await this.assertDuty(actor, row.ownerOrganisationId, 'COLLECTION');
    const next = nextReminder(row.stage as CollectionStage);
    if (!next) throw new BadRequestException(row.stage === 'REMINDER_3' ? 'All three reminders are sent: hand the case to Legal.' : 'This case takes no more reminders.');
    const now = new Date();
    const updated = await this.move(actor, row, next, actionDueAfter(next, now), 'REMINDER_SENT', note);
    const lease = await this.lease(row.leaseId);
    const number = REMINDER_NUMBER[next]!;
    await this.notify([lease.createdBy], row, `rent-collection:${row.id}:${next}`, `Rent reminder ${number}`,
      `${lease.unit.label}, ${lease.unit.asset.name}: the rent of ${money(row.currency, Number(row.amount))} for ${row.period} is unpaid. Please pay by ${day(payBy(next, now))}. Reminder letter ${number} (${row.id}) is on the lease.`, row.tenantOrganisationId);
    return this.get(actor, updated.id);
  }

  /** Anyone of the owner's team records a contact with the tenant: a call, a message, a visit, a promise to pay. */
  async followUp(actor: AuthenticatedUser, id: string, input: { channel: string; note: string; promiseDate?: string }) {
    const row = await this.findForStaff(actor, id);
    if (!ACTIVE_STAGES.includes(row.stage as CollectionStage)) throw new BadRequestException('This case is closed.');
    const entry: FollowUp = { at: new Date().toISOString(), by: actor.userId, byName: actor.name, channel: input.channel, note: input.note, ...(input.promiseDate ? { promiseDate: input.promiseDate.slice(0, 10) } : {}) };
    const followUps = [...(row.followUps as unknown as FollowUp[]), entry];
    const claimed = await this.prisma.rentCollectionCase.updateMany({ where: { id, updatedAt: row.updatedAt }, data: { followUps: followUps as unknown as Prisma.InputJsonValue } });
    if (!claimed.count) throw new ConflictException('The case changed meanwhile. Reload it.');
    await this.record(actor, 'rent_collection.follow_up', row, { channel: input.channel, promiseDate: entry.promiseDate ?? null });
    return this.get(actor, id);
  }

  /** The case goes to a member of the collection team (or the Asset Owner). */
  async assign(actor: AuthenticatedUser, id: string, userId: string) {
    const row = await this.findForStaff(actor, id);
    await this.assertDuty(actor, row.ownerOrganisationId, 'COLLECTION');
    const team = await this.dutyHolders(row.ownerOrganisationId, 'COLLECTION');
    const members = await this.members(row.ownerOrganisationId);
    const owner = members.find((member) => member.userId === userId && member.role === 'Asset Owner');
    if (!team.includes(userId) && !owner) throw new BadRequestException('Assign the case to someone with the collection duty.');
    const claimed = await this.prisma.rentCollectionCase.updateMany({ where: { id, updatedAt: row.updatedAt }, data: { assignedUserId: userId } });
    if (!claimed.count) throw new ConflictException('The case changed meanwhile. Reload it.');
    await this.record(actor, 'rent_collection.assigned', row, { assignedUserId: userId });
    await this.notify([userId], row, `rent-collection:${row.id}:assigned:${userId}:${Date.now()}`, 'Collection case assigned to you', `${row.id}: the rent for ${row.period} (${money(row.currency, Number(row.amount))}) is yours to follow up.`, row.ownerOrganisationId);
    return this.get(actor, id);
  }

  /** After the third reminder, the case goes to the owner's legal team. */
  async escalate(actor: AuthenticatedUser, id: string, note: string) {
    const row = await this.findForStaff(actor, id);
    await this.assertDuty(actor, row.ownerOrganisationId, 'COLLECTION');
    if (row.stage !== 'REMINDER_3') throw new BadRequestException('A case goes to Legal after the third reminder.');
    const updated = await this.move(actor, row, 'LEGAL', row.actionDueAt, 'TO_LEGAL', note);
    const legal = await this.dutyHolders(row.ownerOrganisationId, 'LEGAL');
    const lease = await this.lease(row.leaseId);
    await this.notify(legal.length ? legal : [lease.unit.asset.ownerUserId], row, `rent-collection:${row.id}:legal`, 'Rent arrears passed to Legal',
      `${row.id}: ${lease.unit.label}, ${lease.unit.asset.name}, rent for ${row.period} (${money(row.currency, Number(row.amount))}) is unpaid after three reminders. ${note}`, row.ownerOrganisationId);
    return this.get(actor, updated.id);
  }

  /** The Asset Owner, or Legal once it has the case, closes it without payment (settled outside, written off), with a reason. */
  async close(actor: AuthenticatedUser, id: string, reason: string) {
    const row = await this.findForStaff(actor, id);
    if (!ACTIVE_STAGES.includes(row.stage as CollectionStage)) throw new BadRequestException('This case is already closed.');
    const legal = row.stage === 'LEGAL' && (await this.dutyHolders(row.ownerOrganisationId, 'LEGAL')).includes(actor.userId);
    if (actor.role !== 'Asset Owner' && !legal) throw new ForbiddenException('Only the Asset Owner, or Legal once it has the case, closes it.');
    const updated = await this.move(actor, row, 'CLOSED', row.actionDueAt, 'CLOSED', reason, { closedAt: new Date(), closedReason: reason });
    return this.get(actor, updated.id);
  }

  /** A reminder letter as a PDF, for the owner's team or the tenant. */
  async letter(actor: AuthenticatedUser, id: string, number: number, language: string) {
    const row = await this.prisma.rentCollectionCase.findUnique({ where: { id } });
    const tenant = row && actor.organisationId === row.tenantOrganisationId;
    const staff = row && actor.organisationId === row.ownerOrganisationId && ASSET_OWNER_ROLES.has(actor.role);
    if (!row || (!tenant && !staff && actor.role !== 'Super Admin')) throw new NotFoundException('Collection case not found.');
    const stage = (Object.entries(REMINDER_NUMBER).find(([, value]) => value === number) ?? [])[0] as CollectionStage | undefined;
    const sent = (row.history as unknown as HistoryEntry[]).find((entry) => entry.action === 'REMINDER_SENT' && entry.stage === stage);
    if (!stage || !sent) throw new NotFoundException('That reminder has not been sent.');
    const [lease, organisations, payments] = await Promise.all([
      this.lease(row.leaseId),
      this.prisma.organisation.findMany({ where: { id: { in: [row.ownerOrganisationId, row.tenantOrganisationId] } }, select: { id: true, name: true } }),
      this.prisma.leaseRentPayment.findMany({ where: { leaseId: row.leaseId, status: 'DUE', dueDate: { lt: new Date(sent.at) } }, select: { amount: true, dueDate: true } }),
    ]);
    const name = (orgId: string) => organisations.find((organisation) => organisation.id === orgId)?.name ?? orgId;
    const payment = await this.prisma.leaseRentPayment.findUnique({ where: { id: row.paymentId }, select: { dueDate: true } });
    const buffer = await renderReminderLetter({
      number: number as 1 | 2 | 3, language: language === 'en' ? 'en' : 'ms', caseId: row.id, issuedOn: day(new Date(sent.at))!, payBy: day(payBy(stage, new Date(sent.at)))!,
      ownerName: name(row.ownerOrganisationId), tenantName: name(row.tenantOrganisationId), unit: lease.unit.label, asset: lease.unit.asset.name, leaseId: row.leaseId, leaseStart: day(lease.startDate)!,
      period: row.period, dueDate: day(payment?.dueDate)!, amount: money(row.currency, Number(row.amount)),
      totalOverdue: money(row.currency, Math.max(Number(row.amount), payments.reduce((total, item) => total + Number(item.amount), 0))),
    });
    return { buffer, filename: `${row.id}-reminder-${number}.pdf` };
  }

  /** The reminder letters a tenant has for a lease (shown on the lease). */
  async lettersForLease(actor: AuthenticatedUser, leaseId: string) {
    const rows = await this.prisma.rentCollectionCase.findMany({ where: { leaseId, OR: [{ tenantOrganisationId: actor.organisationId }, { ownerOrganisationId: actor.organisationId }] }, orderBy: { createdAt: 'asc' } });
    return rows.flatMap((row) => (row.history as unknown as HistoryEntry[]).filter((entry) => entry.action === 'REMINDER_SENT').map((entry) => ({ caseId: row.id, period: row.period, number: REMINDER_NUMBER[entry.stage]!, sentAt: entry.at, stage: row.stage })));
  }

  // ---- Daily: open cases for months unpaid past the grace days, and chase late steps ----

  async sweep(now = new Date()): Promise<number> {
    let changed = await this.closePaid({});
    const cutoff = addDays(now, -COLLECTION_GRACE_DAYS);
    const unpaid = await this.prisma.leaseRentPayment.findMany({ where: { status: 'DUE', dueDate: { lte: cutoff }, lease: { status: { in: ['APPROVED', 'ENDED'] } } }, select: { id: true, leaseId: true, period: true, dueDate: true, amount: true, currency: true, lease: { select: { ownerOrganisationId: true, tenantOrganisationId: true, countryNodeId: true, unit: { select: { label: true, asset: { select: { name: true, ownerUserId: true } } } } } } } });
    const existing = new Set((await this.prisma.rentCollectionCase.findMany({ where: { paymentId: { in: unpaid.map((payment) => payment.id) } }, select: { paymentId: true } })).map((row) => row.paymentId));
    for (const payment of unpaid.filter((item) => !existing.has(item.id) && shouldOpenCase(item.dueDate, now))) {
      const { lease } = payment;
      const entry: HistoryEntry = { at: now.toISOString(), by: 'SYSTEM', byName: 'System', action: 'OPENED', stage: 'OPEN', note: `Unpaid ${COLLECTION_GRACE_DAYS} days after the due date ${day(payment.dueDate)}.` };
      const created = await this.prisma.rentCollectionCase.create({ data: {
        id: newCountryScopedId('COLL', lease.countryNodeId), leaseId: payment.leaseId, paymentId: payment.id, period: payment.period, ownerOrganisationId: lease.ownerOrganisationId, tenantOrganisationId: lease.tenantOrganisationId,
        countryNodeId: lease.countryNodeId, amount: payment.amount, currency: payment.currency, stage: 'OPEN', actionDueAt: actionDueAfter('OPEN', now), history: [entry] as unknown as Prisma.InputJsonValue, followUps: [],
      } }).catch(() => null);
      if (!created) continue;
      const team = await this.dutyHolders(lease.ownerOrganisationId, 'COLLECTION');
      await this.notify(team.length ? team : [lease.unit.asset.ownerUserId], created, `rent-collection:${created.id}:opened`, 'New collection case',
        `${lease.unit.label}, ${lease.unit.asset.name}: the rent of ${money(payment.currency, Number(payment.amount))} for ${payment.period} is unpaid. Send reminder 1 by ${day(created.actionDueAt)} (${created.id}).`, lease.ownerOrganisationId);
      changed += 1;
    }
    const late = await this.prisma.rentCollectionCase.findMany({ where: { stage: { in: ['OPEN', 'REMINDER_1', 'REMINDER_2', 'REMINDER_3'] }, actionDueAt: { lt: now } } });
    for (const row of late) {
      const team = row.assignedUserId ? [row.assignedUserId] : await this.dutyHolders(row.ownerOrganisationId, 'COLLECTION');
      const next = row.stage === 'REMINDER_3' ? 'hand it to Legal' : `send reminder ${REMINDER_NUMBER[nextReminder(row.stage as CollectionStage)!]}`;
      if (team.length) await this.notify(team, row, `rent-collection:${row.id}:late:${row.stage}`, 'Collection step overdue', `${row.id}: rent for ${row.period} is still unpaid; ${next} (was due ${day(row.actionDueAt)}).`, row.ownerOrganisationId);
    }
    return changed;
  }

  // ---- helpers ----

  /** Cases whose month has since been recorded as paid are closed as PAID. */
  private async closePaid(where: Prisma.RentCollectionCaseWhereInput) {
    const open = await this.prisma.rentCollectionCase.findMany({ where: { ...where, stage: { in: ACTIVE_STAGES } }, select: { id: true, paymentId: true, history: true, updatedAt: true } });
    if (!open.length) return 0;
    const paid = await this.prisma.leaseRentPayment.findMany({ where: { id: { in: open.map((row) => row.paymentId) }, status: 'PAID' }, select: { id: true, paidAt: true, reference: true } });
    let closed = 0;
    for (const payment of paid) {
      const row = open.find((item) => item.paymentId === payment.id)!;
      const entry: HistoryEntry = { at: new Date().toISOString(), by: 'SYSTEM', byName: 'System', action: 'PAID', stage: 'PAID', note: `Paid ${day(payment.paidAt) ?? ''}${payment.reference ? `, ref ${payment.reference}` : ''}`.trim() };
      const result = await this.prisma.rentCollectionCase.updateMany({ where: { id: row.id, updatedAt: row.updatedAt }, data: { stage: 'PAID', closedAt: new Date(), closedReason: 'Paid', history: [...(row.history as unknown as HistoryEntry[]), entry] as unknown as Prisma.InputJsonValue } });
      closed += result.count;
    }
    return closed;
  }

  private async move(actor: AuthenticatedUser, row: { id: string; updatedAt: Date; history: Prisma.JsonValue; ownerOrganisationId: string; countryNodeId: string; leaseId: string; period: string; stage: string }, stage: CollectionStage, actionDueAt: Date, action: string, note?: string, extra: Prisma.RentCollectionCaseUpdateManyMutationInput = {}) {
    const entry: HistoryEntry = { at: new Date().toISOString(), by: actor.userId, byName: actor.name, action, stage, ...(note ? { note } : {}) };
    const claimed = await this.prisma.rentCollectionCase.updateMany({ where: { id: row.id, updatedAt: row.updatedAt }, data: { stage, actionDueAt, history: [...(row.history as unknown as HistoryEntry[]), entry] as unknown as Prisma.InputJsonValue, ...extra } });
    if (!claimed.count) throw new ConflictException('The case changed meanwhile. Reload it.');
    await this.record(actor, `rent_collection.${action.toLowerCase()}`, row, { from: row.stage, to: stage, note: note ?? null });
    return { id: row.id };
  }

  private record(actor: AuthenticatedUser, action: string, row: { id: string; ownerOrganisationId: string; countryNodeId: string; leaseId: string; period: string }, metadata: Record<string, unknown>) {
    return this.audit.recordActor(actor, { action, resourceType: 'RentCollectionCase', resourceId: row.id, organisationId: row.ownerOrganisationId, countryNodeId: row.countryNodeId, metadata: { leaseId: row.leaseId, period: row.period, ...metadata } });
  }

  private async notify(userIds: string[], row: { id: string; countryNodeId: string }, key: string, title: string, message: string, organisationId: string) {
    if (!this.notifications) return;
    await Promise.all([...new Set(userIds)].map((userId) => this.notifications!.enqueue({
      recipientUserId: userId, organisationId, countryNodeId: row.countryNodeId, type: 'ASSET_LEASE', title, message, resourceType: 'RentCollectionCase', resourceId: row.id, dedupeKey: `${key}:${userId}`,
    }).catch(() => undefined)));
  }

  private assertOwnerStaff(actor: AuthenticatedUser) {
    if (!ASSET_OWNER_ROLES.has(actor.role)) throw new ForbiddenException("Rent collection is for the asset owner's team.");
  }

  private async findForStaff(actor: AuthenticatedUser, id: string) {
    this.assertOwnerStaff(actor);
    const row = await this.prisma.rentCollectionCase.findFirst({ where: { id, ownerOrganisationId: actor.organisationId } });
    if (!row) throw new NotFoundException('Collection case not found.');
    return row;
  }

  /** The Asset Owner may act on any case; anyone else needs the duty. */
  private async assertDuty(actor: AuthenticatedUser, organisationId: string, duty: OrganisationDutyCode) {
    if (actor.role === 'Asset Owner') return;
    if (!(await this.dutyHolders(organisationId, duty)).includes(actor.userId)) throw new ForbiddenException(duty === 'COLLECTION' ? 'This needs the collection duty. Ask the Asset Owner to give it to you.' : 'This needs the legal duty.');
  }

  private async dutyHolders(organisationId: string, duty: OrganisationDutyCode) {
    return (await this.prisma.organisationDuty.findMany({ where: { organisationId, duty }, select: { userId: true } })).map((row) => row.userId);
  }

  /** The people of an organisation (an active role there), with their role. */
  private async members(organisationId: string) {
    const assignments = await this.prisma.userRoleAssignment.findMany({ where: { organisationId, isActive: true }, select: { userId: true, role: true } });
    const users = assignments.length ? await this.prisma.user.findMany({ where: { id: { in: assignments.map((item) => item.userId) }, isActive: true }, select: { id: true, name: true, email: true } }) : [];
    return users.map((user) => ({ userId: user.id, name: user.name, email: user.email, role: String(assignments.find((item) => item.userId === user.id)!.role).replace(/_/g, ' ') }));
  }

  private lease(id: string) {
    return this.prisma.assetLease.findUniqueOrThrow({ where: { id }, select: LEASE_SELECT });
  }

  private async views(actor: AuthenticatedUser, rows: RentCollectionCase[]) {
    if (!rows.length) return [];
    const now = new Date();
    const [leases, payments, organisations, holders] = await Promise.all([
      this.prisma.assetLease.findMany({ where: { id: { in: [...new Set(rows.map((row) => row.leaseId))] } }, select: LEASE_SELECT }),
      this.prisma.leaseRentPayment.findMany({ where: { id: { in: rows.map((row) => row.paymentId) } }, select: { id: true, dueDate: true } }),
      this.prisma.organisation.findMany({ where: { id: { in: [...new Set(rows.map((row) => row.tenantOrganisationId))] } }, select: { id: true, name: true } }),
      this.prisma.organisationDuty.findMany({ where: { organisationId: rows[0].ownerOrganisationId, userId: actor.userId }, select: { duty: true } }),
    ]);
    const userIds = [...new Set(rows.flatMap((row) => (row.assignedUserId ? [row.assignedUserId] : [])))];
    const users = userIds.length ? await this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } }) : [];
    const duties = new Set(holders.map((item) => item.duty));
    const owner = actor.role === 'Asset Owner';
    const collector = owner || duties.has('COLLECTION');
    return rows.map((row) => {
      const lease = leases.find((item) => item.id === row.leaseId);
      const stage = row.stage as CollectionStage;
      const active = ACTIVE_STAGES.includes(stage);
      const history = row.history as unknown as HistoryEntry[];
      return {
        id: row.id, leaseId: row.leaseId, period: row.period, amount: Number(row.amount), currency: row.currency, stage,
        unit: lease?.unit.label ?? '', asset: lease?.unit.asset.name ?? '', tenantName: organisations.find((item) => item.id === row.tenantOrganisationId)?.name ?? '',
        dueDate: day(payments.find((item) => item.id === row.paymentId)?.dueDate), actionDueAt: day(row.actionDueAt), late: active && stage !== 'LEGAL' && row.actionDueAt < now,
        nextStep: active ? (stage === 'LEGAL' ? null : stage === 'REMINDER_3' ? 'LEGAL' : nextReminder(stage)) : null,
        assignedUserId: row.assignedUserId, assignedName: users.find((item) => item.id === row.assignedUserId)?.name ?? null,
        letters: history.filter((entry) => entry.action === 'REMINDER_SENT').map((entry) => ({ number: REMINDER_NUMBER[entry.stage]!, sentAt: entry.at })),
        history, followUps: row.followUps as unknown as FollowUp[],
        closedAt: row.closedAt?.toISOString() ?? null, closedReason: row.closedReason,
        canRemind: collector && !!nextReminder(stage), canEscalate: collector && stage === 'REMINDER_3', canAssign: collector && active,
        canFollowUp: active, canClose: active && (owner || (stage === 'LEGAL' && duties.has('LEGAL'))),
      };
    });
  }
}
