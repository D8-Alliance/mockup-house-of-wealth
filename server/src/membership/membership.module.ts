import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { MembershipController } from './membership.controller';
import { MembershipService } from './membership.service';
import { ToyyibPayService } from './toyyibpay.service';
import { FinancialLedgerModule } from '../financial/financial-ledger.module';

@Module({
  imports: [AuditModule, FinancialLedgerModule],
  controllers: [MembershipController],
  providers: [MembershipService, ToyyibPayService],
  exports: [MembershipService, ToyyibPayService],
})
export class MembershipModule {}
