import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Roles, RequirePermission } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/identity.service';
import { PoolsService } from './pools.service';
import { FeatureModuleGuard } from '../modules/feature-module.guard';
import { RequireFeatureModule } from '../modules/feature-module.decorator';

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
}

export interface CreatePoolDto {
  projectId: string;
  poolName: string;
  currency: string;
  investmentStructure: string;
  indicativeExpectedReturn: number;
  organisationId: string;
  countryNodeId: string;
}
