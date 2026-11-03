import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { FeatureModuleModule } from '../modules/feature-module.module';
import { NotificationModule } from '../notifications/notification.module';
import { LeasingController } from './leasing.controller';
import { LeasingService } from './leasing.service';
import { LeaseReminderSweeper } from './lease-reminder.sweeper';

@Module({
  imports: [AuditModule, FeatureModuleModule, NotificationModule],
  controllers: [LeasingController],
  providers: [LeasingService, LeaseReminderSweeper],
})
export class LeasingModule {}
