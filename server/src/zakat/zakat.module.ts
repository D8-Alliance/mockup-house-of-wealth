import { Module } from '@nestjs/common';
import { ZakatController } from './zakat.controller';
import { ZakatService } from './zakat.service';
import { AuditModule } from '../audit/audit.module';
import { MembershipModule } from '../membership/membership.module';
import { FinancialLedgerModule } from '../financial/financial-ledger.module';

@Module({
  imports: [AuditModule, MembershipModule, FinancialLedgerModule],
  controllers: [ZakatController],
  providers: [ZakatService],
})
export class ZakatModule {}
