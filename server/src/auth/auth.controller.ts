import { Throttle } from '@nestjs/throttler';
import { Body, Controller, Headers, Post } from '@nestjs/common';
import { IdentityService } from './identity.service';
import { Public } from './roles.decorator';
import { DemoRegisterDto, DemoRegistrationService } from './demo-registration.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly identity: IdentityService, private readonly demoRegistration: DemoRegistrationService) {}

  @Post('logout')
  async logout(@Headers('authorization') authorization?: string) {
    const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (token) await this.identity.revokeToken(token);
    return { success: true };
  }

  // Public sign-up for AUTH_MODE=mock only; refused in every other mode.
  // Public sign-up: a handful per minute per IP is enough for people and stops bulk account creation.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Public()
  @Post('demo-register')
  demoRegister(@Body() input: DemoRegisterDto) {
    return this.demoRegistration.register(input);
  }
}
