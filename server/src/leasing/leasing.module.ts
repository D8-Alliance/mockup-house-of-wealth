import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ContractIntelligenceModule } from '../contract-intelligence/contract-intelligence.module';
import { FeatureModuleModule } from '../modules/feature-module.module';
import { NotificationModule } from '../notifications/notification.module';
import { LeasingController } from './leasing.controller';
import { LeasingService } from './leasing.service';
import { LeaseReminderSweeper } from './lease-reminder.sweeper';
import { RentCollectionController } from './rent-collection.controller';
import { RentCollectionService } from './rent-collection.service';

@Module({
  imports: [AuditModule, FeatureModuleModule, NotificationModule, ContractIntelligenceModule],
  controllers: [LeasingController, RentCollectionController],
  providers: [LeasingService, RentCollectionService, LeaseReminderSweeper],
})
export class LeasingModule {}
