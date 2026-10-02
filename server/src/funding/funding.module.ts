import { Module } from '@nestjs/common';
import { FundingController } from './funding.controller';
import { FundingService } from './funding.service';
import { AuditModule } from '../audit/audit.module';
import { PolicyModule } from '../policy/policy.module';
import { FeatureModuleModule } from '../modules/feature-module.module';
import { FinancialLedgerModule } from '../financial/financial-ledger.module';

@Module({
  imports: [AuditModule, PolicyModule, FeatureModuleModule, FinancialLedgerModule],
  controllers: [FundingController],
  providers: [FundingService],
})
export class FundingModule {}
