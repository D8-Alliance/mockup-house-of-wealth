import { FeatureModuleModule } from '../modules/feature-module.module';
import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { AuditModule } from '../audit/audit.module';
import { PolicyModule } from '../policy/policy.module';
import { MembershipModule } from '../membership/membership.module';

@Module({
  imports: [AuditModule, PolicyModule, FeatureModuleModule, MembershipModule],
  controllers: [ProjectsController],
  providers: [ProjectsService],
})
export class ProjectsModule {}
