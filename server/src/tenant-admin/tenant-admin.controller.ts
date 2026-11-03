import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/identity.service';
import { RequirePermission, Roles } from '../auth/roles.decorator';
import { CreateCountryNodeDto, CreateOrganisationDto, MoveUserDto, SetStatusDto } from './tenant-admin.dto';
import { TenantAdminService } from './tenant-admin.service';

/** Organisations, country nodes and moving a person between organisations (Super Admin and Country Admin). */
@Controller()
export class TenantAdminController {
  constructor(private readonly tenants: TenantAdminService) {}

  @Get('country-nodes')
  @Roles('Super Admin', 'Country Admin')
  countryNodes(@CurrentUser() actor: AuthenticatedUser) { return this.tenants.listCountryNodes(actor); }

  @Post('country-nodes')
  @Roles('Super Admin')
  @RequirePermission('governance', 'update')
  createCountryNode(@CurrentUser() actor: AuthenticatedUser, @Body() body: CreateCountryNodeDto) { return this.tenants.createCountryNode(actor, body); }

  @Patch('country-nodes/:code/status')
  @Roles('Super Admin')
  @RequirePermission('governance', 'update')
  setCountryNodeStatus(@CurrentUser() actor: AuthenticatedUser, @Param('code') code: string, @Body() body: SetStatusDto) { return this.tenants.setCountryNodeStatus(actor, code, body); }

  @Post('organisations')
  @Roles('Super Admin', 'Country Admin')
  @RequirePermission('users', 'update')
  createOrganisation(@CurrentUser() actor: AuthenticatedUser, @Body() body: CreateOrganisationDto) { return this.tenants.createOrganisation(actor, body); }

  @Patch('organisations/:id/status')
  @Roles('Super Admin', 'Country Admin')
  @RequirePermission('users', 'update')
  setOrganisationStatus(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() body: SetStatusDto) { return this.tenants.setOrganisationStatus(actor, id, body); }

  @Post('users/:userId/organisation')
  @Roles('Super Admin', 'Country Admin')
  @RequirePermission('users', 'update')
  moveUser(@CurrentUser() actor: AuthenticatedUser, @Param('userId') userId: string, @Body() body: MoveUserDto) { return this.tenants.moveUser(actor, userId, body); }
}
