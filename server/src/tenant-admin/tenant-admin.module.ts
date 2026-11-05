import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma.module';
import { PublicNetworkController } from './public-network.controller';
import { TenantAdminController } from './tenant-admin.controller';
import { TenantAdminService } from './tenant-admin.service';

@Module({ imports: [PrismaModule, AuditModule], controllers: [TenantAdminController, PublicNetworkController], providers: [TenantAdminService] })
export class TenantAdminModule {}
