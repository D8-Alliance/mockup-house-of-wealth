import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { FeatureModuleKey, FeatureModuleMode } from './feature-module.types';
import { UpdateFeatureModuleDto } from './feature-module.dto';

@Injectable()
export class FeatureModuleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list() {
    return this.prisma.featureModule.findMany({ orderBy: { moduleKey: 'asc' } });
  }

  async update(moduleKey: FeatureModuleKey, input: UpdateFeatureModuleDto, actor: AuthenticatedUser) {
    const existing = await this.prisma.featureModule.findUnique({ where: { moduleKey } });
    if (!existing) throw new NotFoundException('Feature module not found');

    const mode: FeatureModuleMode = input.mode ?? (input.enabled === false ? 'DISABLED' : 'ACTIVE');
    if (existing.moduleKey === 'FINANCIAL_LEDGER' && mode !== 'ACTIVE') {
      throw new ForbiddenException('The financial ledger module cannot be disabled');
    }

    const updated = await this.prisma.featureModule.update({
      where: { moduleKey },
      data: { enabled: mode !== 'DISABLED', mode, updatedBy: actor.userId },
    });
    await this.audit.recordActor(actor, {
      action: mode === 'DISABLED' ? 'module.disable' : 'module.configure',
      resourceType: 'FeatureModule',
      resourceId: moduleKey,
      metadata: { previousMode: existing.mode, previousEnabled: existing.enabled, mode },
    });
    return updated;
  }
}
