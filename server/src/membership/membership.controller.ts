import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/identity.service';
import { MembershipService } from './membership.service';
import { UpgradeMembershipDto } from './membership.dto';

@Controller('membership')
export class MembershipController {
  constructor(private readonly membershipService: MembershipService) {}

  @Get('plans')
  plans() {
    return this.membershipService.getPlans();
  }

  @Get('me')
  current(@CurrentUser() actor: AuthenticatedUser) {
    return this.membershipService.getCurrent(actor);
  }

  @Get('me/billing')
  billing(@CurrentUser() actor: AuthenticatedUser) {
    return this.membershipService.billing(actor);
  }

  @Post('me/upgrade')
  upgrade(@CurrentUser() actor: AuthenticatedUser, @Body() input: UpgradeMembershipDto) {
    return this.membershipService.upgrade(actor, input);
  }
}
