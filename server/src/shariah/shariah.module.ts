import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PolicyModule } from '../policy/policy.module';
import { ShariahController } from './shariah.controller';
import { ShariahService } from './shariah.service';
import { FeatureModuleModule } from '../modules/feature-module.module';
import { NotificationModule } from '../notifications/notification.module';

@Module({
  imports: [AuditModule, PolicyModule, FeatureModuleModule, NotificationModule],
  controllers: [ShariahController],
  providers: [ShariahService],
})
export class ShariahModule {}
