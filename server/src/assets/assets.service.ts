import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { detectDocumentType } from '../kyc/kyc.service';
import { PrismaService } from '../prisma.service';
import { inspectDocument } from '../projects/document-integrity';
import { newCountryScopedId } from '../users/user-identity';
import { ASSET_DOCUMENT_TYPES, ReviewAssetDto, SaveAssetDto, SitePhotoMetadataDto, SubmitAssetDto } from './asset.dto';
import { AssetDetails, assetIdentityKey, checkAssetDocuments, detailGaps, requiredDocuments } from './asset-checks';
import { DocumentTextReader } from '../kyc/checks/document-text-reader';
import { structuringGuidance } from './asset-structuring';

/** Roles that register assets for their own organisation. */
export const ASSET_OWNER_ROLES: ReadonlySet<string> = new Set(['Asset Owner', 'Asset Manager']);
/** Roles that verify assets: title and ownership are legal questions, so Legal Officers alongside Country Admins. */
export const ASSET_REVIEWER_ROLES: ReadonlySet<string> = new Set(['Super Admin', 'Country Admin', 'Legal Officer']);

const EDITABLE = new Set(['DRAFT', 'CHANGES_REQUESTED']);
const MAX_FILE_BYTES = 15 * 1024 * 1024;

const DOCUMENT_SELECT = { id: true, documentType: true, fileName: true, mimeType: true, fileSize: true, sha256: true, integrity: true, metadata: true, uploadedBy: true, createdAt: true } satisfies Prisma.AssetDocumentSelect;
/** Assets that no longer count when looking for the same asset registered twice. */
const INACTIVE = ['WITHDRAWN', 'REJECTED'];
const DOCUMENT_LABELS: Record<string, string> = {
  OWNERSHIP: 'proof of ownership (land title, JPJ ownership certificate, purchase invoice, or building title or sale agreement)',
  OFFICIAL_SEARCH: 'official land search (Carian Rasmi)',
  SERIAL_PLATE: 'a photo of the serial plate',
  DOSH_CERTIFICATE: 'the JKKP certificate of fitness (PMA)',
  COMPLETION_CERT: 'the completion certificate (CCC or certificate of fitness)',
};
/** Documents whose text is read for the checks. */
const READABLE_DOCUMENTS = new Set(['OWNERSHIP', 'OFFICIAL_SEARCH', 'QUIT_RENT', 'SERIAL_PLATE', 'DOSH_CERTIFICATE', 'INSPECTION', 'ASSESSMENT', 'COMPLETION_CERT']);
const TYPE_NAMES: Record<string, string> = { LAND: 'land', VEHICLE: 'vehicle', MACHINERY: 'machine', EQUIPMENT: 'equipment', BUILDING: 'building' };

/** The details sent for this asset's type (land, vehicle, machine or building). */
function detailsFor(input: SaveAssetDto): AssetDetails | undefined {
  if (input.assetType === 'LAND') return input.land;
  if (input.assetType === 'VEHICLE') return input.vehicle;
  if (input.assetType === 'MACHINERY' || input.assetType === 'EQUIPMENT') return input.machine;
  if (input.assetType === 'BUILDING') return input.building;
  return undefined;
}

type AssetWithDocuments = Prisma.AssetGetPayload<{ include: { documents: { select: typeof DOCUMENT_SELECT } } }>;

@Injectable()
export class AssetsService {
  /** Reads PDF text, or OCR on photos (English and Malay), in this server; shared with the KYC checks. */
  private readonly reader = new DocumentTextReader();

  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  /** Owners see their organisation's assets; reviewers see their country's (Super Admin: every country). */
  async list(actor: AuthenticatedUser, status?: string) {
    const where: Prisma.AssetWhereInput = { ...this.readScope(actor), ...(status ? { status } : {}) };
    const assets = await this.prisma.asset.findMany({ where, orderBy: { updatedAt: 'desc' }, include: { documents: { select: DOCUMENT_SELECT }, organisation: { select: { name: true } } } });
    return assets.map((asset) => ({ ...this.view(asset), organisationName: asset.organisation.name }));
  }

  async get(actor: AuthenticatedUser, id: string) {
    const asset = await this.find(actor, id);
    if (!ASSET_REVIEWER_ROLES.has(actor.role) || !asset.identityKey) return this.view(asset);
    // Only reviewers learn that another owner registered the same asset: owners never see other owners' assets.
    const others = await this.prisma.asset.findMany({ where: { identityKey: asset.identityKey, id: { not: asset.id }, status: { notIn: INACTIVE } }, select: { id: true, status: true, organisation: { select: { name: true } } } });
    return { ...this.view(asset), duplicates: others.map((other) => ({ id: other.id, status: other.status, organisationName: other.organisation.name })) };
  }

  /** Which Islamic contracts suit the asset, from its own facts (free; no AI involved). */
  async structuring(actor: AuthenticatedUser, id: string) {
    return structuringGuidance(AssetsService.structuringFacts(await this.find(actor, id)));
  }

  /** The asset as the AI adviser may see it: its facts and the rule-based guidance, no names or files. */
  async adviserContext(actor: AuthenticatedUser, id: string) {
    const asset = await this.find(actor, id);
    const facts = AssetsService.structuringFacts(asset);
    return {
      subjectId: asset.id,
      asset: { assetType: asset.assetType, location: asset.location, estimatedValue: Number(asset.estimatedValue), currency: asset.currency, valuationDate: asset.valuationDate?.toISOString().slice(0, 10) ?? null, isEncumbered: asset.isEncumbered, intendedUse: asset.intendedUse, status: asset.status, description: asset.description.slice(0, 1000), documentTypes: facts.documentTypes },
      guidance: structuringGuidance(facts),
    };
  }

  private static structuringFacts(asset: AssetWithDocuments) {
    return { assetType: asset.assetType, status: asset.status, isEncumbered: asset.isEncumbered, encumbranceNote: asset.encumbranceNote, valuationDate: asset.valuationDate, valuerName: asset.valuerName, intendedUse: asset.intendedUse, documentTypes: asset.documents.map((document) => document.documentType) };
  }

  async create(actor: AuthenticatedUser, input: SaveAssetDto) {
    this.assertOwnerRole(actor);
    await this.assertNotRegisteredTwice(actor, input);
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
    await this.assertNotRegisteredTwice(actor, input, id);
    const updated = await this.prisma.asset.update({ where: { id }, data: this.fields(input), include: { documents: { select: DOCUMENT_SELECT } } });
    await this.record(actor, 'asset.update', updated);
    return this.view(updated);
  }

  async uploadDocument(actor: AuthenticatedUser, id: string, documentType: string, file: Express.Multer.File | undefined, location?: SitePhotoMetadataDto) {
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
      data: { assetId: id, documentType, fileName: file.originalname.slice(0, 200), mimeType, fileSize: file.size, fileContent: file.buffer, sha256: integrity.sha256, integrity: { ...integrity, flags } as unknown as Prisma.InputJsonValue, uploadedBy: actor.userId, ...(documentType === 'SITE_PHOTO' && location?.latitude !== undefined && location.longitude !== undefined ? { metadata: { latitude: location.latitude, longitude: location.longitude, accuracyMetres: location.accuracyMetres ?? null, capturedAt: new Date().toISOString() } } : {}) },
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
    const missing = requiredDocuments(asset.assetType, asset.details as AssetDetails | null).filter((type) => !asset.documents.some((document) => document.documentType === type));
    if (missing.length) throw new BadRequestException(`Upload ${missing.map((type) => DOCUMENT_LABELS[type] ?? type).join(' and ')} first.`);
    const gaps = detailGaps(asset.assetType, asset.details as AssetDetails | null);
    if (gaps.length) throw new BadRequestException(`Complete the ${TYPE_NAMES[asset.assetType] ?? 'asset'} details first: ${gaps.join(', ')}.`);
    await this.claim(id, asset.status, { status: 'SUBMITTED', submittedAt: new Date(), declarations: { ...declarations, confirmedAt: new Date().toISOString() } });
    const checked = await this.runDocumentChecks(id, actor.organisationId);
    await this.record(actor, 'asset.submit', checked, { findings: (checked.checkFindings as unknown[] | null)?.length ?? 0 });
    return this.view(checked);
  }

  /** Re-runs the document checks, e.g. after an owner replaced a document or OCR improved. Reviewers only. */
  async rerunChecks(actor: AuthenticatedUser, id: string) {
    if (!ASSET_REVIEWER_ROLES.has(actor.role)) throw new ForbiddenException('Only a Country Admin or Legal Officer can re-run the checks.');
    const asset = await this.find(actor, id);
    const checked = await this.runDocumentChecks(id, asset.organisationId);
    await this.record(actor, 'asset.checks.run', checked);
    return this.get(actor, id);
  }

  /** Reads the asset's documents and stores what they agree or disagree with. Never decides the review. */
  private async runDocumentChecks(id: string, organisationId: string) {
    const asset = await this.prisma.asset.findUniqueOrThrow({ where: { id }, include: { documents: { select: { documentType: true, mimeType: true, fileContent: true, metadata: true }, orderBy: { createdAt: 'asc' } } } });
    const organisation = await this.prisma.organisation.findUnique({ where: { id: organisationId }, select: { name: true } });
    const documents = [];
    for (const document of asset.documents) {
      const readable = READABLE_DOCUMENTS.has(document.documentType);
      const text = readable ? await this.reader.read({ mimeType: document.mimeType, content: Buffer.from(document.fileContent) }).catch(() => null) : null;
      documents.push({ documentType: document.documentType, text, metadata: document.metadata as { latitude?: number; longitude?: number } | null });
    }
    // Personal organisations are named "<person> (individual)"; the title shows the person.
    const ownerName = (organisation?.name ?? '').replace(/\s*\((individual|asset owner|individual investor)\)\s*$/i, '');
    const findings = checkAssetDocuments({ assetType: asset.assetType, ownerName, isEncumbered: asset.isEncumbered, latitude: asset.latitude, longitude: asset.longitude, location: asset.location, details: asset.details as AssetDetails | null }, documents);
    return this.prisma.asset.update({ where: { id }, data: { checkFindings: findings as unknown as Prisma.InputJsonValue, checkedAt: new Date() }, include: { documents: { select: DOCUMENT_SELECT } } });
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
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      details: detailsFor(input) ? (JSON.parse(JSON.stringify(detailsFor(input))) as Prisma.InputJsonValue) : Prisma.JsonNull,
      identityKey: assetIdentityKey(input.assetType, detailsFor(input)),
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

  /** The same asset (land lot, chassis number, machine serial, building title) registered twice by one organisation is refused. */
  private async assertNotRegisteredTwice(actor: AuthenticatedUser, input: SaveAssetDto, exceptId?: string) {
    const key = assetIdentityKey(input.assetType, detailsFor(input));
    if (!key) return;
    const existing = await this.prisma.asset.findFirst({ where: { identityKey: key, organisationId: actor.organisationId, status: { notIn: INACTIVE }, ...(exceptId ? { id: { not: exceptId } } : {}) }, select: { id: true } });
    if (existing) throw new ConflictException(`This ${TYPE_NAMES[input.assetType] ?? 'asset'} is already registered as ${existing.id}.`);
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
