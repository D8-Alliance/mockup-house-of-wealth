import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { FinancialLedgerModule } from '../financial/financial-ledger.module';
import { PrismaModule } from '../prisma.module';
import { InvestmentsController } from './investments.controller';
import { InvestmentsService } from './investments.service';

@Module({ imports: [PrismaModule, AuditModule, FinancialLedgerModule], controllers: [InvestmentsController], providers: [InvestmentsService] })
export class InvestmentsModule {}
