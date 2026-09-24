import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PolicyModule } from '../policy/policy.module';
import { ShariahController } from './shariah.controller';
import { ShariahService } from './shariah.service';
import { FeatureModuleModule } from '../modules/feature-module.module';

@Module({
  imports: [AuditModule, PolicyModule, FeatureModuleModule],
  controllers: [ShariahController],
  providers: [ShariahService],
})
export class ShariahModule {}
