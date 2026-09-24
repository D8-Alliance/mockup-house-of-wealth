import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AiModule } from '../ai/ai.module';
import { PolicyModule } from '../policy/policy.module';
import { ContractIntelligenceController } from './contract-intelligence.controller';
import { ContractIntelligenceService } from './contract-intelligence.service';
import { AgreementGenerationService } from './agreement-generation.service';

@Module({
  imports: [AuditModule, PolicyModule, AiModule],
  controllers: [ContractIntelligenceController],
  providers: [ContractIntelligenceService, AgreementGenerationService],
  exports: [AgreementGenerationService],
})
export class ContractIntelligenceModule {}
