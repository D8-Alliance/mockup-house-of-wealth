import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { FeatureModuleModule } from '../modules/feature-module.module';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { NotificationModule } from '../notifications/notification.module';
import { AssetExpirySweeper } from './asset-expiry.sweeper';

@Module({
  imports: [AuditModule, FeatureModuleModule, NotificationModule],
  controllers: [AssetsController],
  providers: [AssetsService, AssetExpirySweeper],
  exports: [AssetsService],
})
export class AssetsModule {}
