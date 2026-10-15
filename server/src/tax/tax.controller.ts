import { Body, Controller, Get, Put } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/identity.service';
import { TaxProfileDto, TaxProfileService } from './tax-profile.service';

@Controller('tax')
export class TaxController {
  constructor(private readonly profiles: TaxProfileService) {}

  @Get('profile')
  profile(@CurrentUser() actor: AuthenticatedUser) {
    return this.profiles.getMasked(actor);
  }

  @Put('profile')
  setProfile(@CurrentUser() actor: AuthenticatedUser, @Body() input: TaxProfileDto) {
    return this.profiles.set(actor, input);
  }
}
