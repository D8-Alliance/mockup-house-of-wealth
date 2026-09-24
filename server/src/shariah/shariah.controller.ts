import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles, RequirePermission } from '../auth/roles.decorator';
import { AuthenticatedUser } from '../auth/identity.service';
import { CreateShariahDecisionDto, CreateShariahReviewDto } from './shariah.dto';
import { ShariahService } from './shariah.service';
import { FeatureModuleGuard } from '../modules/feature-module.guard';
import { RequireFeatureModule } from '../modules/feature-module.decorator';

@Controller('shariah/reviews')
@UseGuards(FeatureModuleGuard)
@RequireFeatureModule('SHARIAH_GOVERNANCE')
export class ShariahController {
  constructor(private readonly shariah: ShariahService) {}

  @Get()
  @RequirePermission('governance', 'read')
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.shariah.list(user);
  }

  @Get('notifications')
  @RequirePermission('governance', 'read')
  notifications(@CurrentUser() user: AuthenticatedUser) {
    return this.shariah.notifications(user);
  }

  @Get('central/malaysia')
  @Roles('Super Admin', 'Shariah Advisor', 'Shariah Reviewer', 'Shariah Committee')
  @RequirePermission('governance', 'read')
  centralMalaysia(@CurrentUser() user: AuthenticatedUser) {
    return this.shariah.centralMalaysia(user);
  }

  @Get(':id')
  @RequirePermission('governance', 'read')
  get(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.shariah.get(id, user);
  }

  @Post()
  @Roles('Super Admin', 'Country Admin', 'Organization Admin', 'Project Sponsor', 'Project Manager', 'Shariah Advisor', 'Shariah Reviewer', 'Shariah Committee')
  @RequirePermission('governance', 'create')
  create(@Body() input: CreateShariahReviewDto, @CurrentUser() user: AuthenticatedUser) {
    return this.shariah.create(input, user);
  }

  @Post(':id/decisions')
  @Roles('Super Admin', 'Shariah Advisor', 'Shariah Reviewer', 'Shariah Committee')
  @RequirePermission('governance', 'approve')
  decide(@Param('id') id: string, @Body() input: CreateShariahDecisionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.shariah.decide(id, input, user);
  }

  @Post(':id/revert')
  @Roles('Super Admin', 'Country Admin', 'Organization Admin', 'Project Sponsor', 'Project Manager')
  @RequirePermission('governance', 'create')
  revert(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.shariah.revert(id, user);
  }

  @Post(':id/resubmit')
  @Roles('Super Admin', 'Country Admin', 'Organization Admin', 'Project Sponsor', 'Project Manager')
  @RequirePermission('governance', 'create')
  resubmit(@Param('id') id: string, @Body() input: CreateShariahReviewDto, @CurrentUser() user: AuthenticatedUser) {
    return this.shariah.resubmit(id, input, user);
  }
}
