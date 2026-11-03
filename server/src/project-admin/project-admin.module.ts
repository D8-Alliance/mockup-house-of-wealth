import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { NotificationModule } from '../notifications/notification.module';
import { ProjectAdminController } from './project-admin.controller';
import { ProjectAdminService } from './project-admin.service';

@Module({
  imports: [AuditModule, NotificationModule],
  controllers: [ProjectAdminController],
  providers: [ProjectAdminService],
})
export class ProjectAdminModule {}
