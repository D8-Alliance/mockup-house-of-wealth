import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { FinancialLedgerModule } from '../financial/financial-ledger.module';
import { FeatureModuleModule } from '../modules/feature-module.module';
import { DistributionController } from './distribution.controller';
import { DistributionService } from './distribution.service';
import { PayoutDestinationService } from './payout-destination.service';

@Module({
  imports: [AuditModule, FinancialLedgerModule, FeatureModuleModule],
  controllers: [DistributionController],
  providers: [DistributionService, PayoutDestinationService],
  exports: [DistributionService],
})
export class DistributionModule {}
