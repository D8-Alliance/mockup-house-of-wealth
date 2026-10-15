import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { PolicyService } from '../policy/policy.service';
import { PrismaService } from '../prisma.service';
import { assertTenantScope, tenantScopeFilter } from '../tenancy/tenant-scope';
import { CreateApprovalDto, CreateContractDto, CreatePartyDto, CreateVersionDto, DecideApprovalDto, TransitionContractDto } from './contracts.dto';

const TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['PENDING_APPROVAL'],
  PENDING_APPROVAL: ['APPROVED', 'REJECTED'],
  APPROVED: ['SIGNED'],
  SIGNED: ['ACTIVE'],
  ACTIVE: ['SUSPENDED', 'COMPLETED'],
};

@Injectable()
export class ContractsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly policy: PolicyService,
  ) {}

  async list(actor: AuthenticatedUser) {
    this.require(actor, 'contracts', 'read');
    return this.prisma.contract.findMany({ where: tenantScopeFilter(actor), orderBy: { createdAt: 'desc' }, take: 100 });
  }

  async get(id: string, actor: AuthenticatedUser) {
    this.require(actor, 'contracts', 'read');
    const contract = await this.prisma.contract.findUnique({
      where: { id },
      include: { versions: { orderBy: { version: 'desc' } }, parties: true, approvals: true, events: { orderBy: { createdAt: 'asc' } } },
    });
    if (!contract) throw new NotFoundException('Contract not found');
    assertTenantScope(actor, contract, 'Contract');
    return contract;
  }

  async create(input: CreateContractDto, actor: AuthenticatedUser) {
    this.require(actor, 'contracts', 'create');
    assertTenantScope(actor, input, 'Target tenant');
    const organisation = await this.prisma.organisation.findFirst({ where: { id: input.organisationId, countryNodeId: input.countryNodeId } });
    if (!organisation) throw new ForbiddenException('Organisation is outside the requested country node scope');
    const contract = await this.prisma.contract.create({ data: { ...input, createdBy: actor.userId } });
    await this.event(contract.id, actor, 'CONTRACT_CREATED', undefined, contract.status);
    return contract;
  }

  async addVersion(id: string, input: CreateVersionDto, actor: AuthenticatedUser) {
    this.require(actor, 'contracts', 'update');
    const contract = await this.get(id, actor);
    const version = (contract.versions[0]?.version ?? 0) + 1;
    const versionRecord = await this.prisma.contractVersion.create({
      data: { contractId: id, version, content: input.content as Prisma.InputJsonValue, createdBy: actor.userId },
    });
    await this.audit.recordActor(actor, { action: 'contract.version_created', resourceType: 'ContractVersion', resourceId: versionRecord.id, countryNodeId: actor.countryNodeId, organisationId: actor.organisationId, metadata: { contractId: id, version } });
    return versionRecord;
  }

  async addParty(id: string, input: CreatePartyDto, actor: AuthenticatedUser) {
    this.require(actor, 'contracts', 'update');
    await this.get(id, actor);
    const party = await this.prisma.contractParty.create({ data: { contractId: id, ...input } });
    await this.audit.recordActor(actor, { action: 'contract.party_added', resourceType: 'ContractParty', resourceId: party.id, countryNodeId: actor.countryNodeId, organisationId: actor.organisationId, metadata: { contractId: id, partyType: input.partyType } });
    return party;
  }

  async decideApproval(id: string, approvalId: string, input: DecideApprovalDto, actor: AuthenticatedUser) {
    this.require(actor, 'contracts', 'approve');
    const contract = await this.get(id, actor);
    const approval = await this.prisma.contractApproval.findFirst({ where: { id: approvalId, contractId: id } });
    if (!approval) throw new NotFoundException('Contract approval not found');
    const updated = await this.prisma.contractApproval.update({ where: { id: approvalId }, data: { status: input.status, decisionNote: input.decisionNote, approverId: actor.userId, decidedAt: new Date() } });
    await this.event(id, actor, 'APPROVAL_DECIDED', contract.status, input.status);
    return updated;
  }

  async createApproval(id: string, input: CreateApprovalDto, actor: AuthenticatedUser) {
    this.require(actor, 'contracts', 'update');
    await this.get(id, actor);
    const version = await this.prisma.contractVersion.findFirst({ where: { id: input.versionId, contractId: id } });
    if (!version) throw new NotFoundException('Contract version not found');
    const approval = await this.prisma.contractApproval.create({ data: { contractId: id, versionId: input.versionId, approverId: input.approverId } });
    await this.audit.recordActor(actor, { action: 'contract.approval_created', resourceType: 'ContractApproval', resourceId: approval.id, countryNodeId: actor.countryNodeId, organisationId: actor.organisationId, metadata: { contractId: id, versionId: input.versionId, approverId: input.approverId } });
    return approval;
  }

  async transition(id: string, input: TransitionContractDto, actor: AuthenticatedUser) {
    const action = input.status === 'PENDING_APPROVAL' ? 'update' : input.status === 'APPROVED' ? 'approve' : 'update';
    this.require(actor, 'contracts', action);
    const contract = await this.get(id, actor);
    if (!TRANSITIONS[contract.status]?.includes(input.status)) throw new BadRequestException(`Invalid contract transition ${contract.status} -> ${input.status}`);
    const updated = await this.prisma.contract.update({ where: { id }, data: { status: input.status } });
    await this.event(id, actor, 'STATUS_CHANGED', contract.status, input.status);
    return updated;
  }

  private require(actor: AuthenticatedUser, resource: 'contracts', action: 'read' | 'create' | 'update' | 'approve') {
    if (!this.policy.can(actor.role, resource, action)) throw new ForbiddenException(this.policy.evaluate(actor.role, resource, action).reason);
  }

  private async event(id: string, actor: AuthenticatedUser, eventType: string, fromStatus?: string, toStatus?: string) {
    await this.prisma.contractEvent.create({ data: { contractId: id, eventType, fromStatus, toStatus, actorId: actor.userId, metadata: {} } });
    await this.audit.recordActor(actor, { action: `contract.${eventType.toLowerCase()}`, resourceType: 'Contract', resourceId: id, countryNodeId: actor.countryNodeId, organisationId: actor.organisationId, metadata: { fromStatus, toStatus } });
  }
}
