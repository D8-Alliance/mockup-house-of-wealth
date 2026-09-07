import { Controller, Post, Delete, Get, Param, Body } from '@nestjs/common';
import { Roles, RequirePermission } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/identity.service';
import { UsersService } from './users.service';
import { UserRole } from '../policy/permissions';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Assign a role to a user in a specific organisation and country node.
   * POST /users/:userId/roles
   * Body: { role, organisationId, countryNodeId }
   */
  @Post(':userId/roles')
  @Roles('Super Admin', 'Country Admin')
  @RequirePermission('users', 'update')
  async assignRole(
    @Param('userId') userId: string,
    @Body() body: { role: UserRole; organisationId: string; countryNodeId: string },
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.usersService.assignRole(
      userId,
      body.role,
      body.organisationId,
      body.countryNodeId,
      actor,
    );
  }

  /**
   * Revoke a role from a user in a specific organisation and country node.
   * DELETE /users/:userId/roles/:role/orgs/:organisationId/countries/:countryNodeId
   */
  @Delete(':userId/roles/:role/orgs/:organisationId/countries/:countryNodeId')
  @Roles('Super Admin', 'Country Admin')
  @RequirePermission('users', 'update')
  async revokeRole(
    @Param('userId') userId: string,
    @Param('role') role: UserRole,
    @Param('organisationId') organisationId: string,
    @Param('countryNodeId') countryNodeId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.usersService.revokeRole(
      userId,
      role,
      organisationId,
      countryNodeId,
      actor,
    );
  }

  /**
   * List all active roles for a user.
   * GET /users/:userId/roles
   */
  @Get(':userId/roles')
  @RequirePermission('users', 'read')
  async getUserRoles(@Param('userId') userId: string) {
    return this.usersService.getUserRoles(userId);
  }
}
