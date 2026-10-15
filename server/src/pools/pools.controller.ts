import { Body, Controller, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { Roles, RequirePermission } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/identity.service';
import { PoolsService } from './pools.service';
import { FeatureModuleGuard } from '../modules/feature-module.guard';
import { RequireFeatureModule } from '../modules/feature-module.decorator';
import { CreatePoolDto, SetAkadTermsDto, UpdatePoolStatusDto } from './pools.dto';

@Controller('pools')
@UseGuards(FeatureModuleGuard)
@RequireFeatureModule('WEALTH_POOLING')
export class PoolsController {
  constructor(private readonly poolsService: PoolsService) {}

  @Get()
  @RequirePermission('pooling', 'read')
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.poolsService.list(user);
  }

  @Get(':id')
  @RequirePermission('pooling', 'read')
  get(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.poolsService.get(id, user);
  }

  @Post()
  @Roles('Super Admin', 'Country Admin', 'Organization Admin', 'Pool Manager')
  @RequirePermission('pooling', 'create')
  create(@Body() body: CreatePoolDto, @CurrentUser() user: AuthenticatedUser) {
    return this.poolsService.create(body, user);
  }

  @Get(':id/akad-terms')
  @RequirePermission('pooling', 'read')
  akadTerms(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.poolsService.akadTerms(id, user);
  }

  /** Sets the akad terms; refused once any investor has accepted the current version. */
  @Put(':id/akad-terms')
  @Roles('Super Admin', 'Country Admin', 'Organization Admin', 'Pool Manager')
  @RequirePermission('pooling', 'update')
  setAkadTerms(@Param('id') id: string, @Body() body: SetAkadTermsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.poolsService.setAkadTerms(id, body, user);
  }

  @Patch(':id/status')
  @Roles('Super Admin', 'Country Admin', 'Organization Admin', 'Pool Manager')
  @RequirePermission('pooling', 'update')
  transitionStatus(@Param('id') id: string, @Body() body: UpdatePoolStatusDto, @CurrentUser() user: AuthenticatedUser) {
    return this.poolsService.transitionStatus(id, body.status, user, body.note);
  }
}

