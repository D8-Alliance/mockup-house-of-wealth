import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { FeatureModuleModule } from '../modules/feature-module.module';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';

@Module({
  imports: [AuditModule, FeatureModuleModule],
  controllers: [AssetsController],
  providers: [AssetsService],
})
export class AssetsModule {}
