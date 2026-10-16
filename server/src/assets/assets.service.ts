import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { detectDocumentType } from '../kyc/kyc.service';
import { PrismaService } from '../prisma.service';
import { inspectDocument } from '../projects/document-integrity';
import { newCountryScopedId } from '../users/user-identity';
import { ASSET_DOCUMENT_TYPES, ReviewAssetDto, SaveAssetDto, SubmitAssetDto } from './asset.dto';

/** Roles that register assets for their own organisation. */
export const ASSET_OWNER_ROLES: ReadonlySet<string> = new Set(['Asset Owner', 'Asset Manager']);
/** Roles that verify assets: title and ownership are legal questions, so Legal Officers alongside Country Admins. */
export const ASSET_REVIEWER_ROLES: ReadonlySet<string> = new Set(['Super Admin', 'Country Admin', 'Legal Officer']);

const EDITABLE = new Set(['DRAFT', 'CHANGES_REQUESTED']);
const MAX_FILE_BYTES = 15 * 1024 * 1024;

const DOCUMENT_SELECT = { id: true, documentType: true, fileName: true, mimeType: true, fileSize: true, sha256: true, integrity: true, uploadedBy: true, createdAt: true } satisfies Prisma.AssetDocumentSelect;

type AssetWithDocuments = Prisma.AssetGetPayload<{ include: { documents: { select: typeof DOCUMENT_SELECT } } }>;

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  /** Owners see their organisation's assets; reviewers see their country's (Super Admin: every country). */
  async list(actor: AuthenticatedUser, status?: string) {
    const where: Prisma.AssetWhereInput = { ...this.readScope(actor), ...(status ? { status } : {}) };
    const assets = await this.prisma.asset.findMany({ where, orderBy: { updatedAt: 'desc' }, include: { documents: { select: DOCUMENT_SELECT }, organisation: { select: { name: true } } } });
    return assets.map((asset) => ({ ...this.view(asset), organisationName: asset.organisation.name }));
  }

  async get(actor: AuthenticatedUser, id: string) {
    return this.view(await this.find(actor, id));
  }

  async create(actor: AuthenticatedUser, input: SaveAssetDto) {
    this.assertOwnerRole(actor);
    const asset = await this.prisma.asset.create({
      data: { id: newCountryScopedId('ASSET', actor.countryNodeId), organisationId: actor.organisationId, countryNodeId: actor.countryNodeId, ownerUserId: actor.userId, ...this.fields(input) },
      include: { documents: { select: DOCUMENT_SELECT } },
    });
    await this.record(actor, 'asset.create', asset, { assetType: asset.assetType });
    return this.view(asset);
  }

  async update(actor: AuthenticatedUser, id: string, input: SaveAssetDto) {
    const asset = await this.findOwn(actor, id);
    this.assertEditable(asset.status);
    const updated = await this.prisma.asset.update({ where: { id }, data: this.fields(input), include: { documents: { select: DOCUMENT_SELECT } } });
    await this.record(actor, 'asset.update', updated);
    return this.view(updated);
  }

  async uploadDocument(actor: AuthenticatedUser, id: string, documentType: string, file: Express.Multer.File | undefined) {
    if (!(ASSET_DOCUMENT_TYPES as readonly string[]).includes(documentType)) throw new BadRequestException(`Choose a document type: ${ASSET_DOCUMENT_TYPES.join(', ')}.`);
    if (!file) throw new BadRequestException('A PDF, JPG or PNG file is required.');
    if (file.size > MAX_FILE_BYTES) throw new BadRequestException('The file is larger than 15 MB.');
    const mimeType = detectDocumentType(file.buffer);
    if (!mimeType) throw new BadRequestException('The file is not a valid PDF, JPG or PNG. Upload the original scan or photo.');
    const asset = await this.findOwn(actor, id);
    this.assertEditable(asset.status);
    const integrity = inspectDocument(file.buffer);
    // The same file on another organisation's asset suggests a copied or borrowed document.
    const reused = await this.prisma.assetDocument.count({ where: { sha256: integrity.sha256, asset: { organisationId: { not: asset.organisationId } } } });
    const flags = reused ? [...integrity.flags, { code: 'REUSED_ELSEWHERE', message: `The same file is attached to ${reused} asset(s) of another owner.` }] : integrity.flags;
    const document = await this.prisma.assetDocument.create({
      data: { assetId: id, documentType, fileName: file.originalname.slice(0, 200), mimeType, fileSize: file.size, fileContent: file.buffer, sha256: integrity.sha256, integrity: { ...integrity, flags } as unknown as Prisma.InputJsonValue, uploadedBy: actor.userId },
      select: DOCUMENT_SELECT,
    });
    await this.record(actor, 'asset.document.upload', asset, { documentId: document.id, documentType, sha256: document.sha256, flags: flags.map((flag) => flag.code) });
    return this.get(actor, id);
  }

  async removeDocument(actor: AuthenticatedUser, id: string, documentId: string) {
    const asset = await this.findOwn(actor, id);
    this.assertEditable(asset.status);
    const deleted = await this.prisma.assetDocument.deleteMany({ where: { id: documentId, assetId: id } });
    if (!deleted.count) throw new NotFoundException('Document not found.');
    await this.record(actor, 'asset.document.remove', asset, { documentId });
    return this.get(actor, id);
  }

  async downloadDocument(actor: AuthenticatedUser, id: string, documentId: string) {
    await this.find(actor, id);
    const document = await this.prisma.assetDocument.findFirst({ where: { id: documentId, assetId: id } });
    if (!document) throw new NotFoundException('Document not found.');
    await this.audit.recordActor(actor, { action: 'asset.document.download', resourceType: 'AssetDocument', resourceId: documentId, organisationId: actor.organisationId, countryNodeId: actor.countryNodeId, metadata: { assetId: id } });
    return document;
  }

  /** Sends the asset for verification. Proof of ownership is required. */
  async submit(actor: AuthenticatedUser, id: string, declarations: SubmitAssetDto) {
    const asset = await this.findOwn(actor, id);
    this.assertEditable(asset.status);
    if (!asset.documents.some((document) => document.documentType === 'OWNERSHIP')) throw new BadRequestException('Upload proof of ownership first (land title, grant, sale agreement or purchase invoice).');
    const updated = await this.claim(id, asset.status, { status: 'SUBMITTED', submittedAt: new Date(), declarations: { ...declarations, confirmedAt: new Date().toISOString() } });
    await this.record(actor, 'asset.submit', updated);
    return this.view(updated);
  }

  async withdraw(actor: AuthenticatedUser, id: string) {
    const asset = await this.findOwn(actor, id);
    if (asset.status === 'VERIFIED' || asset.status === 'WITHDRAWN') throw new BadRequestException(asset.status === 'VERIFIED' ? 'A verified asset cannot be withdrawn here; contact your Country Admin.' : 'The asset is already withdrawn.');
    const updated = await this.claim(id, asset.status, { status: 'WITHDRAWN' });
    await this.record(actor, 'asset.withdraw', updated);
    return this.view(updated);
  }

  /** A Country Admin or Legal Officer of the asset's country decides; never someone from the owner's organisation. */
  async review(actor: AuthenticatedUser, id: string, input: ReviewAssetDto) {
    if (!ASSET_REVIEWER_ROLES.has(actor.role)) throw new ForbiddenException('Only a Country Admin or Legal Officer can verify assets.');
    const asset = await this.find(actor, id);
    if (asset.organisationId === actor.organisationId || asset.ownerUserId === actor.userId) throw new ForbiddenException('You cannot verify an asset of your own organisation.');
    if (asset.status !== 'SUBMITTED') throw new BadRequestException('Only submitted assets can be reviewed.');
    const updated = await this.claim(id, 'SUBMITTED', { status: input.decision, reviewedBy: actor.userId, reviewedAt: new Date(), reviewNote: input.note });
    await this.record(actor, 'asset.review', updated, { decision: input.decision });
    return this.view(updated);
  }

  private fields(input: SaveAssetDto) {
    return {
      assetType: input.assetType,
      name: input.name,
      description: input.description ?? '',
      location: input.location ?? '',
      titleReference: input.titleReference || null,
      estimatedValue: new Prisma.Decimal(input.estimatedValue),
      currency: input.currency,
      valuationDate: input.valuationDate ? new Date(input.valuationDate) : null,
      valuerName: input.valuerName || null,
      isEncumbered: input.isEncumbered ?? false,
      encumbranceNote: input.isEncumbered ? input.encumbranceNote || null : null,
      intendedUse: input.intendedUse ?? 'UNDECIDED',
    };
  }

  /** Changes the status only if nobody changed it meanwhile (two reviewers, or owner and reviewer). */
  private async claim(id: string, from: string, data: Prisma.AssetUpdateManyMutationInput) {
    const result = await this.prisma.asset.updateMany({ where: { id, status: from }, data });
    if (!result.count) throw new ConflictException('The asset was changed by someone else. Reload and try again.');
    return this.prisma.asset.findUniqueOrThrow({ where: { id }, include: { documents: { select: DOCUMENT_SELECT } } });
  }

  private readScope(actor: AuthenticatedUser): Prisma.AssetWhereInput {
    if (actor.role === 'Super Admin') return {};
    if (ASSET_REVIEWER_ROLES.has(actor.role)) return { countryNodeId: actor.countryNodeId, status: { not: 'DRAFT' } };
    return { organisationId: actor.organisationId, countryNodeId: actor.countryNodeId };
  }

  private async find(actor: AuthenticatedUser, id: string): Promise<AssetWithDocuments> {
    const asset = await this.prisma.asset.findFirst({ where: { id, ...this.readScope(actor) }, include: { documents: { select: DOCUMENT_SELECT } } });
    if (!asset) throw new NotFoundException('Asset not found.');
    return asset;
  }

  private async findOwn(actor: AuthenticatedUser, id: string) {
    this.assertOwnerRole(actor);
    const asset = await this.prisma.asset.findFirst({ where: { id, organisationId: actor.organisationId, countryNodeId: actor.countryNodeId }, include: { documents: { select: DOCUMENT_SELECT } } });
    if (!asset) throw new NotFoundException('Asset not found.');
    return asset;
  }

  private assertOwnerRole(actor: AuthenticatedUser) {
    if (!ASSET_OWNER_ROLES.has(actor.role)) throw new ForbiddenException('Only an Asset Owner or Asset Manager can register assets.');
  }

  private assertEditable(status: string) {
    if (!EDITABLE.has(status)) throw new BadRequestException(status === 'SUBMITTED' ? 'The asset is waiting for verification and cannot be changed.' : `A ${status.toLowerCase().replace('_', ' ')} asset cannot be changed.`);
  }

  private view(asset: AssetWithDocuments) {
    return { ...asset, estimatedValue: Number(asset.estimatedValue) };
  }

  private record(actor: AuthenticatedUser, action: string, asset: { id: string; organisationId: string; countryNodeId: string; status: string }, metadata: Record<string, unknown> = {}) {
    return this.audit.recordActor(actor, { action, resourceType: 'Asset', resourceId: asset.id, organisationId: asset.organisationId, countryNodeId: asset.countryNodeId, metadata: { status: asset.status, ...metadata } });
  }
}
