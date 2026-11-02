import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma.module';
import { GovernanceController } from './governance.controller';
import { GovernanceService } from './governance.service';

@Module({ imports: [PrismaModule, AuditModule], controllers: [GovernanceController], providers: [GovernanceService] })
export class GovernanceModule {}
