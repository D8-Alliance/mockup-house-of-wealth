import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/identity.service';
import { RequirePermission, Roles } from '../auth/roles.decorator';
import { CreateCountryNodeDto, CreateOrganisationDto, MoveUserDto, SetProhibitedActivitiesDto, SetStatusDto } from './tenant-admin.dto';
import { TenantAdminService } from './tenant-admin.service';
import { PROHIBITED_ACTIVITY_CATEGORIES } from '../shariah/prohibited-activities';

/** Organisations, country nodes and moving a person between organisations (Super Admin and Country Admin). */
@Controller()
export class TenantAdminController {
  constructor(private readonly tenants: TenantAdminService) {}

  /** The platform's own prohibited-activity list, which every country's words are added to. */
  @Get('prohibited-activities')
  @Roles('Super Admin', 'Country Admin')
  prohibitedActivities() { return PROHIBITED_ACTIVITY_CATEGORIES; }

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

  /** The country's own prohibited-activity words; the Country Admin for their country. */
  @Patch('country-nodes/:code/prohibited-activities')
  @Roles('Super Admin', 'Country Admin')
  @RequirePermission('governance', 'update')
  setProhibitedActivities(@CurrentUser() actor: AuthenticatedUser, @Param('code') code: string, @Body() body: SetProhibitedActivitiesDto) { return this.tenants.setProhibitedActivities(actor, code, body); }

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
