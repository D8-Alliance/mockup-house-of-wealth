import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles, RequirePermission } from '../auth/roles.decorator';
import { AuthenticatedUser } from '../auth/identity.service';
import { KybReviewDto, SavePdpApplicationDto } from './pdp.dto';
import { PdpService } from './pdp.service';

/** Organization Admin is left out: it belongs to a client organisation, which should not vet other companies. */
const KYB_REVIEWERS = ['Super Admin', 'Country Admin', 'KYB Officer', 'Compliance Officer'] as const;

@Controller('pdp/applications')
export class PdpController {
  constructor(private readonly pdpService: PdpService) {}

  @Get('mine')
  mine(@CurrentUser() actor: AuthenticatedUser) {
    return this.pdpService.getMine(actor);
  }

  /** The review queue: submitted applications from the reviewer's country (all countries for the Super Admin). */
  @Get()
  @Roles(...KYB_REVIEWERS)
  @RequirePermission('users', 'approve')
  list(@CurrentUser() actor: AuthenticatedUser, @Query('status') status?: string) {
    return this.pdpService.listForReview(actor, status);
  }

  @Get(':id')
  @Roles(...KYB_REVIEWERS)
  @RequirePermission('users', 'approve')
  getOne(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) {
    return this.pdpService.getForReview(actor, id);
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
  @Roles(...KYB_REVIEWERS)
  @RequirePermission('users', 'approve')
  reviewKyb(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() input: KybReviewDto,
  ) {
    return this.pdpService.reviewKyb(actor, id, input.decision, input.justification);
  }
}
