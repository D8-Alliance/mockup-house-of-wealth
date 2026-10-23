import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { NotificationModule } from '../notifications/notification.module';
import { OrganisationKybController } from './organisation-kyb.controller';
import { OrganisationKybService } from './organisation-kyb.service';

@Module({
  imports: [AuditModule, NotificationModule],
  controllers: [OrganisationKybController],
  providers: [OrganisationKybService],
  exports: [OrganisationKybService],
})
export class OrganisationKybModule {}
