import { Global, Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { RoleAvailabilityController } from './role-availability.controller';
import { RoleAvailabilityService } from './role-availability.service';

// Global: sign-in (IdentityService), role assignment and sign-up all check it.
@Global()
@Module({
  imports: [AuditModule],
  controllers: [RoleAvailabilityController],
  providers: [RoleAvailabilityService],
  exports: [RoleAvailabilityService],
})
export class RoleAvailabilityModule {}
