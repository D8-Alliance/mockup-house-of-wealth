import { FeatureModuleModule } from '../modules/feature-module.module';
import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PolicyModule } from '../policy/policy.module';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';

@Module({ imports: [AuditModule, PolicyModule, FeatureModuleModule], controllers: [ContractsController], providers: [ContractsService] })
export class ContractsModule {}
