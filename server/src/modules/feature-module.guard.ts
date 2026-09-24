import { CanActivate, ExecutionContext, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma.service';
import { FEATURE_MODULE_KEY } from './feature-module.decorator';
import { FeatureModuleKey } from './feature-module.types';

@Injectable()
export class FeatureModuleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const moduleKey = this.reflector.getAllAndOverride<FeatureModuleKey | undefined>(FEATURE_MODULE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!moduleKey) return true;

    const module = await this.prisma.featureModule.findUnique({ where: { moduleKey } });
    if (module && (!module.enabled || module.mode === 'DISABLED')) {
      throw new ServiceUnavailableException(`The ${module.name} module is currently disabled`);
    }
    return true;
  }
}
