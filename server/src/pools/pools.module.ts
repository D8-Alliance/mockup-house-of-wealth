import { Module } from '@nestjs/common';
import { PoolsController } from './pools.controller';
import { PoolsService } from './pools.service';
import { AuditModule } from '../audit/audit.module';
import { PolicyModule } from '../policy/policy.module';
import { FeatureModuleModule } from '../modules/feature-module.module';
import { NotificationModule } from '../notifications/notification.module';

@Module({
  imports: [AuditModule, PolicyModule, FeatureModuleModule, NotificationModule],
  controllers: [PoolsController],
  providers: [PoolsService],
})
export class PoolsModule {}
