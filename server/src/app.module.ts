import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { OidcGuard } from './auth/oidc.guard';
import { RolesGuard } from './auth/roles.guard';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { PolicyModule } from './policy/policy.module';
import { PrismaModule } from './prisma.module';
import { ProjectsModule } from './projects/projects.module';
import { PoolsModule } from './pools/pools.module';
import { FundingModule } from './funding/funding.module';
import { UsersModule } from './users/users.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    PolicyModule,
    AuditModule,
    ProjectsModule,
    PoolsModule,
    FundingModule,
    UsersModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: OidcGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
