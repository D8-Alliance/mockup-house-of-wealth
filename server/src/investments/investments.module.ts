import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { FinancialLedgerModule } from '../financial/financial-ledger.module';
import { PrismaModule } from '../prisma.module';
import { InvestmentsController } from './investments.controller';
import { InvestmentsService } from './investments.service';
import { FeatureModuleModule } from '../modules/feature-module.module';
import { NotificationModule } from '../notifications/notification.module';

@Module({ imports: [PrismaModule, AuditModule, FinancialLedgerModule, FeatureModuleModule, NotificationModule], controllers: [InvestmentsController], providers: [InvestmentsService] })
export class InvestmentsModule {}
