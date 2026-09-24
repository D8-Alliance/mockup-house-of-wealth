import { Module } from '@nestjs/common';
import { IdentityService } from './identity.service';
import { AuthController } from './auth.controller';

@Module({
  providers: [IdentityService],
  controllers: [AuthController],
  exports: [IdentityService],
})
export class AuthModule {}
