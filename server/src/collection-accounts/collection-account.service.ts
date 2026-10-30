import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { PrismaService } from '../prisma.service';
import { SaveCollectionAccountDto } from './collection-account.dto';

export interface CollectionAccountView {
  countryNodeId: string;
  countryName: string;
  currency: string;
  account: { bankName: string; accountName: string; accountNumber: string; swiftCode: string | null; instructions: string | null; updatedAt: string } | null;
}

/**
 * The platform's trust (escrow) account in each country, which investors transfer to (decision 2026-10-30:
 * one platform account per country, not one per pool, so investor money never goes straight to a sponsor).
 */
@Injectable()
export class CollectionAccountService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  /** Every country for Super Admin; the own country for Country Admin and finance staff. */
  async list(actor: AuthenticatedUser): Promise<CollectionAccountView[]> {
    const nodes = await this.prisma.countryNode.findMany({
      where: actor.role === 'Super Admin' ? {} : { code: actor.countryNodeId },
      include: { collectionAccount: true },
      orderBy: { name: 'asc' },
    });
    return nodes.map((node) => ({
      countryNodeId: node.code,
      countryName: node.name,
      currency: node.currency,
      account: node.collectionAccount ? {
        bankName: node.collectionAccount.bankName,
        accountName: node.collectionAccount.accountName,
        accountNumber: node.collectionAccount.accountNumber,
        swiftCode: node.collectionAccount.swiftCode,
        instructions: node.collectionAccount.instructions,
        updatedAt: node.collectionAccount.updatedAt.toISOString(),
      } : null,
    }));
  }

  /** Super Admin only: a wrong account number would send investors' money elsewhere, so every change is audited. */
  async save(actor: AuthenticatedUser, countryNodeId: string, input: SaveCollectionAccountDto): Promise<CollectionAccountView> {
    if (actor.role !== 'Super Admin') throw new ForbiddenException('Only Super Admin can change a collection account.');
    const node = await this.prisma.countryNode.findUnique({ where: { code: countryNodeId }, include: { collectionAccount: true } });
    if (!node) throw new NotFoundException('Country not found.');
    const data = {
      bankName: input.bankName.trim(),
      accountName: input.accountName.trim(),
      accountNumber: input.accountNumber.trim(),
      swiftCode: input.swiftCode?.trim() || null,
      instructions: input.instructions?.trim() || null,
      currency: node.currency,
      updatedBy: actor.userId,
    };
    await this.prisma.collectionAccount.upsert({ where: { countryNodeId }, update: data, create: { countryNodeId, ...data } });
    await this.audit.recordActor(actor, {
      action: node.collectionAccount ? 'collection_account.update' : 'collection_account.create',
      resourceType: 'CollectionAccount', resourceId: countryNodeId, organisationId: actor.organisationId, countryNodeId,
      metadata: { bankName: data.bankName, accountNumberLast4: data.accountNumber.replace(/\D/g, '').slice(-4), previousAccountNumberLast4: node.collectionAccount?.accountNumber.replace(/\D/g, '').slice(-4) ?? null },
    });
    return (await this.list({ ...actor, countryNodeId } as AuthenticatedUser)).find((view) => view.countryNodeId === countryNodeId)!;
  }

  /** The account investors in this country transfer to, or null when Super Admin has not set it yet. */
  forCountry(countryNodeId: string) {
    return this.prisma.collectionAccount.findUnique({ where: { countryNodeId } });
  }
}
