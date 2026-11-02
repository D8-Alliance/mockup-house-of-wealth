import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { MembershipController } from './membership.controller';
import { MembershipService } from './membership.service';
import { ToyyibPayService } from './toyyibpay.service';
import { FinancialLedgerModule } from '../financial/financial-ledger.module';
import { NotificationModule } from '../notifications/notification.module';
import { MembershipExpirySweeper } from './membership-expiry.sweeper';

@Module({
  imports: [AuditModule, FinancialLedgerModule, NotificationModule],
  controllers: [MembershipController],
  providers: [MembershipService, ToyyibPayService, MembershipExpirySweeper],
  exports: [MembershipService, ToyyibPayService],
})
export class MembershipModule {}
