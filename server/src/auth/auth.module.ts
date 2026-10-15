import { Module } from '@nestjs/common';
import { IdentityService } from './identity.service';
import { AuthController } from './auth.controller';
import { DemoRegistrationService } from './demo-registration.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [IdentityService, DemoRegistrationService],
  controllers: [AuthController],
  exports: [IdentityService],
})
export class AuthModule {}
