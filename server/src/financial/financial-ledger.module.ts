import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { FinancialLedgerController } from './financial-ledger.controller';
import { FinancialLedgerService } from './financial-ledger.service';

@Module({
  imports: [AuditModule],
  controllers: [FinancialLedgerController],
  providers: [FinancialLedgerService],
  exports: [FinancialLedgerService],
})
export class FinancialLedgerModule {}
