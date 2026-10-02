import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { FeatureModuleModule } from '../modules/feature-module.module';
import { PrismaService } from '../prisma.service';
import { KYC_CHECK_PROVIDERS } from './checks/check-types';
import { buildKycCheckProviders } from './checks/kyc-check-providers';
import { KycChecksService } from './checks/kyc-checks.service';
import { KycController, KycWebhookController } from './kyc.controller';
import { KycService } from './kyc.service';
import { KycLivenessService } from './liveness/kyc-liveness.service';

@Module({
  imports: [AuditModule, FeatureModuleModule],
  controllers: [KycController, KycWebhookController],
  providers: [
    KycService,
    KycChecksService,
    KycLivenessService,
    { provide: KYC_CHECK_PROVIDERS, useFactory: (prisma: PrismaService) => buildKycCheckProviders(prisma), inject: [PrismaService] },
  ],
})
export class KycModule {}
