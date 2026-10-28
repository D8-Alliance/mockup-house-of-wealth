import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/identity.service';
import { RequirePermission, Roles } from '../auth/roles.decorator';
import { SaveBeneficiaryDto } from './estate.dto';
import { EstateService } from './estate.service';

/** Individuals and asset owners keep estate instructions; staff and institutions do not. Each sees only their own. */
const OWNERS = ['Retail Investor', 'HNWI Investor', 'Family Office', 'Asset Owner'] as const;

@Controller('estate/beneficiaries')
@Roles(...OWNERS)
export class EstateController {
  constructor(private readonly estate: EstateService) {}

  @Get()
  @RequirePermission('profile', 'read')
  list(@CurrentUser() actor: AuthenticatedUser) { return this.estate.list(actor); }

  @Post()
  @RequirePermission('profile', 'update')
  create(@CurrentUser() actor: AuthenticatedUser, @Body() input: SaveBeneficiaryDto) { return this.estate.create(actor, input); }

  @Put(':id')
  @RequirePermission('profile', 'update')
  update(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() input: SaveBeneficiaryDto) { return this.estate.update(actor, id, input); }

  @Post(':id/primary')
  @RequirePermission('profile', 'update')
  setPrimary(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) { return this.estate.setPrimary(actor, id); }

  @Delete(':id')
  @RequirePermission('profile', 'update')
  remove(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) { return this.estate.remove(actor, id); }
}
