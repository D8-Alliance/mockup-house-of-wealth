import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles, RequirePermission } from '../auth/roles.decorator';
import { AuthenticatedUser } from '../auth/identity.service';
import { SavePdpApplicationDto } from './pdp.dto';
import { PdpService } from './pdp.service';

@Controller('pdp/applications')
export class PdpController {
  constructor(private readonly pdpService: PdpService) {}

  @Get('mine')
  mine(@CurrentUser() actor: AuthenticatedUser) {
    return this.pdpService.getMine(actor);
  }

  @Post()
  create(@CurrentUser() actor: AuthenticatedUser, @Body() input: SavePdpApplicationDto) {
    return this.pdpService.saveDraft(actor, input);
  }

  @Patch(':id')
  update(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() input: SavePdpApplicationDto) {
    return this.pdpService.saveDraft(actor, { ...input, id });
  }

  @Post(':id/submit')
  submit(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) {
    return this.pdpService.submit(actor, id);
  }

  @Post(':id/kyb-review')
  @Roles('Super Admin', 'Country Admin', 'Organization Admin', 'KYB Officer', 'Compliance Officer')
  @RequirePermission('users', 'approve')
  reviewKyb(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() input: { decision: 'APPROVED' | 'REJECTED'; justification: string },
  ) {
    return this.pdpService.reviewKyb(actor, id, input.decision, input.justification);
  }
}
