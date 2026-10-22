import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { FeatureModuleModule } from '../modules/feature-module.module';
import { NotificationModule } from '../notifications/notification.module';
import { AssetPartnershipsController } from './asset-partnerships.controller';
import { AssetPartnershipsService } from './asset-partnerships.service';

@Module({
  imports: [AuditModule, FeatureModuleModule, NotificationModule],
  controllers: [AssetPartnershipsController],
  providers: [AssetPartnershipsService],
  exports: [AssetPartnershipsService],
})
export class AssetPartnershipsModule {}
