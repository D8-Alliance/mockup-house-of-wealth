import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { FeatureModuleController } from './feature-module.controller';
import { FeatureModuleGuard } from './feature-module.guard';
import { FeatureModuleService } from './feature-module.service';

@Module({
  imports: [AuditModule],
  controllers: [FeatureModuleController],
  providers: [FeatureModuleService, FeatureModuleGuard],
  exports: [FeatureModuleGuard, FeatureModuleService],
})
export class FeatureModuleModule {}
