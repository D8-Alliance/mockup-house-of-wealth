import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { IsBoolean, IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { PrismaService } from '../prisma.service';

export class TaxProfileDto {
  /** ISO 3166-1 alpha-2 country of tax residence, e.g. MY. */
  @Matches(/^[A-Z]{2}$/, { message: 'residenceCountry must be a two-letter country code, e.g. MY.' }) residenceCountry!: string;
  /** The user's own declaration of Malaysian tax residence for the year. */
  @IsBoolean() malaysianTaxResident!: boolean;
  @IsIn(['INDIVIDUAL', 'COMPANY']) entityType!: 'INDIVIDUAL' | 'COMPANY';
  /** Tax identification number (TIN), shown masked. Omit to keep the stored one; send "" to remove it. */
  @IsOptional() @IsString() @MaxLength(30) @Matches(/^[A-Za-z0-9 -]*$/, { message: 'taxIdNumber may contain letters, digits, spaces and dashes only.' }) taxIdNumber?: string;
}

export interface TaxProfile {
  residenceCountry: string;
  malaysianTaxResident: boolean;
  entityType: 'INDIVIDUAL' | 'COMPANY';
  taxIdNumber: string | null;
  updatedAt: string;
}

export function maskTaxId(value: string | null | undefined) {
  if (!value) return null;
  const compact = value.replace(/\s+/g, '');
  return compact.length <= 4 ? '****' : `${'*'.repeat(compact.length - 4)}${compact.slice(-4)}`;
}

/**
 * The user's own tax details, used to label statements. The platform does not compute or
 * withhold tax yet; rates depend on the pool's legal structure (PENDING_ACTIVITIES.md, item 11, phase C).
 */
@Injectable()
export class TaxProfileService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async get(userId: string): Promise<TaxProfile | null> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { profile: true } });
    const tax = (user?.profile as { tax?: TaxProfile } | null)?.tax;
    return tax ?? null;
  }

  async getMasked(actor: AuthenticatedUser) {
    const profile = await this.get(actor.userId);
    return profile ? { ...profile, taxIdNumber: maskTaxId(profile.taxIdNumber) } : null;
  }

  async set(actor: AuthenticatedUser, input: TaxProfileDto) {
    let tax!: TaxProfile;
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${actor.userId} FOR UPDATE`;
      const user = await tx.user.findUnique({ where: { id: actor.userId }, select: { profile: true } });
      if (!user) throw new NotFoundException('User not found.');
      const existing = (user.profile as { tax?: TaxProfile } | null)?.tax;
      const taxIdNumber = input.taxIdNumber === undefined ? existing?.taxIdNumber ?? null : input.taxIdNumber.trim() || null;
      tax = { residenceCountry: input.residenceCountry, malaysianTaxResident: input.malaysianTaxResident, entityType: input.entityType, taxIdNumber, updatedAt: new Date().toISOString() };
      await tx.user.update({ where: { id: actor.userId }, data: { profile: { ...((user.profile as Record<string, unknown> | null) || {}), tax } as unknown as Prisma.InputJsonValue } });
      // The TIN itself is not written to the audit log.
      await this.audit.recordActor(actor, { action: 'tax.profile.update', resourceType: 'User', resourceId: actor.userId, organisationId: actor.organisationId, countryNodeId: actor.countryNodeId, metadata: { residenceCountry: tax.residenceCountry, malaysianTaxResident: tax.malaysianTaxResident, entityType: tax.entityType, taxIdProvided: Boolean(tax.taxIdNumber) } }, tx);
    });
    return { ...tax, taxIdNumber: maskTaxId(tax.taxIdNumber) };
  }
}
