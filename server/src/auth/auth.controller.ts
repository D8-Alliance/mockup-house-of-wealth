import { Controller, Headers, Post } from '@nestjs/common';
import { IdentityService } from './identity.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly identity: IdentityService) {}

  @Post('logout')
  async logout(@Headers('authorization') authorization?: string) {
    const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (token) await this.identity.revokeToken(token);
    return { success: true };
  }
}
