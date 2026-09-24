import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { OidcGuard } from './auth/oidc.guard';
import { RolesGuard } from './auth/roles.guard';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { PolicyModule } from './policy/policy.module';
import { PrismaModule } from './prisma.module';
import { ProjectsModule } from './projects/projects.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { PoolsModule } from './pools/pools.module';
import { FundingModule } from './funding/funding.module';
import { UsersModule } from './users/users.module';
import { HealthModule } from './health/health.module';
import { ZakatModule } from './zakat/zakat.module';
import { MembershipModule } from './membership/membership.module';
import { PdpModule } from './pdp/pdp.module';
import { ContractsModule } from './contracts/contracts.module';
import { ShariahModule } from './shariah/shariah.module';
import { FeatureModuleModule } from './modules/feature-module.module';
import { AiModule } from './ai/ai.module';
import { ContractIntelligenceModule } from './contract-intelligence/contract-intelligence.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    PolicyModule,
    AuditModule,
    ProjectsModule,
    DashboardModule,
    PoolsModule,
    FundingModule,
    UsersModule,
    HealthModule,
    ZakatModule,
    MembershipModule,
    PdpModule,
    ContractsModule,
    ShariahModule,
    FeatureModuleModule,
    AiModule,
    ContractIntelligenceModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: OidcGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
