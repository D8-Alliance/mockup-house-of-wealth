import { FeatureModuleModule } from '../modules/feature-module.module';
import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AiModule } from '../ai/ai.module';
import { NotificationModule } from '../notifications/notification.module';
import { PolicyModule } from '../policy/policy.module';
import { ContractIntelligenceController } from './contract-intelligence.controller';
import { ContractIntelligenceService } from './contract-intelligence.service';
import { AgreementGenerationService } from './agreement-generation.service';
import { AgreementSigningService } from './signing/agreement-signing.service';
import { AgreementIntegritySweeper } from './signing/agreement-integrity.sweeper';

@Module({
  imports: [AuditModule, PolicyModule, AiModule, FeatureModuleModule, NotificationModule],
  controllers: [ContractIntelligenceController],
  providers: [ContractIntelligenceService, AgreementGenerationService, AgreementSigningService, AgreementIntegritySweeper],
  exports: [AgreementGenerationService],
})
export class ContractIntelligenceModule {}
