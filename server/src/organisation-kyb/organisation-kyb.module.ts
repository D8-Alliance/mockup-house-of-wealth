import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { NotificationModule } from '../notifications/notification.module';
import { OrganisationKybController } from './organisation-kyb.controller';
import { OrganisationKybService } from './organisation-kyb.service';
import { CorporateGroupsController, CorporateGroupsService } from './corporate-groups.service';

@Module({
  imports: [AuditModule, NotificationModule],
  controllers: [OrganisationKybController, CorporateGroupsController],
  providers: [OrganisationKybService, CorporateGroupsService],
  exports: [OrganisationKybService],
})
export class OrganisationKybModule {}
