import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { MembershipController } from './membership.controller';
import { MembershipService } from './membership.service';

@Module({
  imports: [AuditModule],
  controllers: [MembershipController],
  providers: [MembershipService],
})
export class MembershipModule {}
