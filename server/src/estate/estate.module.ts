import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { DistributionModule } from '../distribution/distribution.module';
import { FinancialLedgerModule } from '../financial/financial-ledger.module';
import { NotificationModule } from '../notifications/notification.module';
import { DeathReportController, EstateCasesController, EstateExecutorsController } from './estate-cases.controller';
import { EstateCasesService } from './estate-cases.service';
import { EstateController, HibahQabulController } from './estate.controller';
import { EstateService } from './estate.service';

@Module({
  imports: [AuditModule, NotificationModule, FinancialLedgerModule, DistributionModule],
  controllers: [EstateController, HibahQabulController, EstateExecutorsController, DeathReportController, EstateCasesController],
  providers: [EstateService, EstateCasesService],
})
export class EstateModule {}
